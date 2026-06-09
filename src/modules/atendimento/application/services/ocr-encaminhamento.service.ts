import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { createWorker, type Worker } from 'tesseract.js';

export interface ResultadoOcr {
  /** true = libera o fluxo (foto ok, formato não-analisável, ou OCR desligado/falhou). */
  aceitavel: boolean;
  /** false quando não rodamos OCR (PDF/HEIC/desconhecido, kill-switch, ou erro). */
  analisado: boolean;
  /** Confiança média do OCR (0-100); 0 quando não analisado. */
  confianca: number;
  /** Mensagem amigável pra pedir reenvio (só quando aceitavel=false). */
  motivo?: string;
}

/** Extensões raster que o Tesseract consegue ler diretamente. */
const EXTENSOES_RASTER = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff', 'pnm']);

/** Termos típicos de um encaminhamento/requisição — dão um "desconto" no limiar. */
const PALAVRAS_ENCAMINHAMENTO =
  /encaminh|paciente|unidade|cid|cns|sus|solicit|exame|consulta|m[eé]dic|prontu|nascimento/i;

const MOTIVO_PADRAO =
  'A foto ficou difícil de ler 😕 Pode enviar outra com o documento bem enquadrado, ' +
  'em local iluminado, sem desfoque e sem cortar as bordas?';

/**
 * OCR de triagem da foto do encaminhamento (Tesseract, 100% local — sem API
 * externa nem custo por imagem). Roda em worker thread, então não trava o event
 * loop. Princípio de segurança: **fail-open** — se não dá pra analisar (formato,
 * erro, kill-switch), libera o fluxo; nunca bloqueia um usuário por falha nossa.
 */
@Injectable()
export class OcrEncaminhamentoService implements OnModuleDestroy {
  private readonly logger = new Logger(OcrEncaminhamentoService.name);

  private worker: Worker | null = null;
  private iniciando: Promise<Worker> | null = null;
  /** Serializa os recognize: um worker processa um job por vez. */
  private fila: Promise<unknown> = Promise.resolve();

  private readonly habilitado: boolean;
  private readonly confMin: number;
  private readonly minChars: number;
  private readonly minPalavras: number;
  /** Teto de tempo de um `recognize`; estourou → fail-open e recria o worker. */
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.habilitado = this.config.get<string>('OCR_HABILITADO', 'true') !== 'false';
    this.confMin = Number(this.config.get<string>('OCR_CONF_MIN', '50'));
    this.minChars = Number(this.config.get<string>('OCR_MIN_CHARS', '25'));
    this.minPalavras = Number(this.config.get<string>('OCR_MIN_PALAVRAS', '6'));
    this.timeoutMs = Number(this.config.get<string>('OCR_TIMEOUT_MS', '15000'));
  }

  async onModuleDestroy(): Promise<void> {
    await this.resetWorker();
  }

  /**
   * Analisa os bytes de uma imagem e decide se está legível o bastante.
   * @param bytes conteúdo do arquivo
   * @param ext   extensão (com ou sem ponto) — define se dá pra ler
   */
  async analisar(bytes: Buffer, ext: string): Promise<ResultadoOcr> {
    if (!this.habilitado) {
      return { aceitavel: true, analisado: false, confianca: 0 };
    }

    const extensao = ext.replace(/^\./, '').toLowerCase();
    if (!EXTENSOES_RASTER.has(extensao)) {
      // PDF/HEIC/desconhecido: não sabemos ler → não bloqueia.
      return { aceitavel: true, analisado: false, confianca: 0 };
    }

    try {
      const { texto, confianca } = await this.reconhecer(bytes);
      return this.avaliar(texto, confianca);
    } catch (err) {
      // Fail-open: erro de decode/worker nunca derruba o atendimento.
      this.logger.error(`OCR falhou (liberando foto): ${(err as Error).message}`);
      return { aceitavel: true, analisado: false, confianca: 0 };
    }
  }

  // ------------------------------------------------------------------ privados

  private avaliar(texto: string, confianca: number): ResultadoOcr {
    const caracteresUteis = texto.replace(/\s/g, '').length;
    const palavras = texto
      .trim()
      .split(/\s+/)
      .filter((p) => p.replace(/[^\p{L}\p{N}]/gu, '').length >= 2).length;
    const temContexto = PALAVRAS_ENCAMINHAMENTO.test(texto);

    // Casar com termos de encaminhamento dá um desconto no limiar de confiança
    // (reduz falso-negativo numa foto válida mas com OCR "tímido").
    const limiarConf = temContexto ? this.confMin - 10 : this.confMin;

    const aceitavel =
      confianca >= limiarConf && caracteresUteis >= this.minChars && palavras >= this.minPalavras;

    return aceitavel
      ? { aceitavel: true, analisado: true, confianca }
      : { aceitavel: false, analisado: true, confianca, motivo: MOTIVO_PADRAO };
  }

  private async reconhecer(bytes: Buffer): Promise<{ texto: string; confianca: number }> {
    const worker = await this.obterWorker();
    // Encadeia na fila pra um job por vez (worker é single-threaded).
    const tarefa = this.fila.then(() => worker.recognize(bytes));
    this.fila = tarefa.catch(() => undefined);
    try {
      const { data } = await this.comTimeout(tarefa, this.timeoutMs);
      return { texto: data.text ?? '', confianca: data.confidence ?? 0 };
    } catch (err) {
      // Timeout ou worker morto: descarta o worker (recria no próximo upload) e
      // zera a fila pra não pendurar as próximas imagens atrás do job travado.
      // Sem isso, um worker que para de responder congela toda a conversa.
      await this.resetWorker();
      throw err;
    }
  }

  /** Rejeita após `ms` se `p` não tiver assentado; limpa o timer nos dois casos. */
  private comTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`OCR excedeu ${ms}ms`)), ms);
      p.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e as Error);
        },
      );
    });
  }

  /**
   * Descarta o worker atual e zera a fila. Zera o estado ANTES do `terminate()`
   * (best-effort) pra que uma chamada concorrente já recrie um worker limpo em
   * vez de enfileirar atrás de um job travado.
   */
  private async resetWorker(): Promise<void> {
    const anterior = this.worker;
    this.worker = null;
    this.iniciando = null;
    this.fila = Promise.resolve();
    if (anterior) await anterior.terminate().catch(() => undefined);
  }

  private obterWorker(): Promise<Worker> {
    if (this.worker) return Promise.resolve(this.worker);
    if (this.iniciando) return this.iniciando;

    const tessdata = join(process.cwd(), 'assets', 'tessdata');
    this.iniciando = createWorker('por', 1, {
      langPath: tessdata, // lê assets/tessdata/por.traineddata.gz (vendorado)
      cachePath: tessdata,
      gzip: true,
    })
      .then((w) => {
        this.worker = w;
        this.logger.log('Worker Tesseract (por) pronto.');
        return w;
      })
      .catch((err) => {
        this.iniciando = null; // permite nova tentativa no próximo upload
        throw err;
      });

    return this.iniciando;
  }
}
