import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CanalConversa,
  OrigemSolicitacao,
  ParaQuem,
  TipoConsulta,
  TipoEspecialidade,
} from '@prisma/client';

import { ListarEspecialidadesUseCase } from '../../../especialidades/application/use-cases/listar-especialidades.use-case';
import { CriarSolicitacaoUseCase } from '../../../solicitacoes/application/use-cases/criar-solicitacao.use-case';
import { CriarSolicitacaoDto } from '../../../solicitacoes/application/dtos/criar-solicitacao.dto';
import { MinioService } from '../../../files/application/services/minio.service';
import { OcrEncaminhamentoService, ResultadoOcr } from './ocr-encaminhamento.service';
import { Fluxo, No, OpcaoFluxo, ProximaAcao, Texto, Variaveis } from '../flows/tipos';
import { fluxoAtendimentoV1 } from '../flows/atendimento-v1.flow';
import { validarCampo } from '../utils/validacao';

export interface AcaoEntrada {
  tipo: 'iniciar' | 'opcao' | 'texto' | 'anexo';
  opcaoId?: string;
  texto?: string;
  anexoUrl?: string;
}

export interface MensagemSaida {
  texto: string;
  imagemUri?: string;
}

export interface ContextoConversa {
  /** Null em conversa ANÔNIMA (WhatsApp sem cadastro) — nunca criamos usuário. */
  usuarioMariaId: string | null;
  noAtual: string | null;
  variaveis: Variaveis;
  /** Canal da conversa — define a `origem` da Solicitacao criada no fim. */
  canal: CanalConversa;
  /** Telefone do WhatsApp (só dígitos) quando a conversa é anônima. */
  contatoExterno?: string | null;
}

export interface ResultadoPasso {
  mensagens: MensagemSaida[];
  proximaAcao: ProximaAcao;
  protocolo?: string;
  finalizada: boolean;
  /** Novo estado a persistir na Conversa. */
  noAtual: string;
  variaveis: Variaveis;
  estado: 'EM_ANDAMENTO' | 'ENCERRADA';
}

/**
 * Motor de fluxo (Fase 0). Determinístico: dado (fluxo em código, estado da
 * conversa, ação de entrada) → (mensagens de saída, próxima ação, novo estado).
 * Não toca no banco diretamente — recebe/devolve o estado; quem persiste é o
 * use-case. Os efeitos externos (criar Solicitacao, listar especialidades) são
 * delegados aos use-cases existentes.
 */
@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger(FlowEngineService.name);
  private readonly fluxo: Fluxo = fluxoAtendimentoV1;
  private readonly maxTentativasOcr: number;

  constructor(
    private readonly listarEspecialidades: ListarEspecialidadesUseCase,
    private readonly criarSolicitacao: CriarSolicitacaoUseCase,
    private readonly minio: MinioService,
    private readonly ocr: OcrEncaminhamentoService,
    config: ConfigService,
  ) {
    this.maxTentativasOcr = Number(config.get<string>('OCR_MAX_TENTATIVAS', '3'));
  }

  async processar(
    ctx: ContextoConversa,
    acao: AcaoEntrada,
    fluxo: Fluxo = this.fluxo,
  ): Promise<ResultadoPasso> {
    const variaveis: Variaveis = { ...ctx.variaveis };
    const mensagens: MensagemSaida[] = [];

    // 1) Início ou retomada
    if (acao.tipo === 'iniciar' || !ctx.noAtual) {
      return this.caminhar(fluxo.inicial, variaveis, mensagens, ctx, fluxo);
    }

    // 2) Consumir a entrada no nó atual
    const atual = fluxo.nos[ctx.noAtual];
    if (!atual) {
      // Estado inconsistente: recomeça do início.
      return this.caminhar(fluxo.inicial, variaveis, mensagens, ctx, fluxo);
    }

    const consumo = await this.consumirEntrada(atual, acao, variaveis);
    if ('erro' in consumo) {
      // Entrada inválida: emite erro e mantém o nó (front re-renderiza a entrada).
      mensagens.push({ texto: consumo.erro });
      return {
        mensagens,
        proximaAcao: await this.acaoDoNo(atual, variaveis),
        finalizada: false,
        noAtual: atual.id,
        variaveis,
        estado: 'EM_ANDAMENTO',
      };
    }

    // 3) Caminhar a partir do próximo nó
    return this.caminhar(consumo.proximo, variaveis, mensagens, ctx, fluxo);
  }

  /** Deriva a próxima ação para um nó atual (usado ao retomar uma conversa). */
  async acaoAtual(
    noAtualId: string | null,
    variaveis: Variaveis,
    fluxo: Fluxo = this.fluxo,
  ): Promise<ProximaAcao> {
    if (!noAtualId) return { tipo: 'nenhum' };
    const no = fluxo.nos[noAtualId];
    if (!no) return { tipo: 'nenhum' };
    return this.acaoDoNo(no, variaveis);
  }

  // ------------------------------------------------------------------ privados

  private async consumirEntrada(
    no: No,
    acao: AcaoEntrada,
    variaveis: Variaveis,
  ): Promise<{ proximo: string } | { erro: string }> {
    switch (no.tipo) {
      case 'ESCOLHA': {
        const valido =
          acao.tipo === 'opcao' &&
          !!acao.opcaoId &&
          (acao.opcaoId in no.ramos || no.opcoes.some((o) => o.id === acao.opcaoId));
        if (!valido || !acao.opcaoId) {
          return { erro: 'Ops! Não entendi a opção. Toca em um dos botões, por favor. 🙂' };
        }
        // Guarda a escolha pro nó de Condição rotear adiante.
        variaveis._opcao = acao.opcaoId;
        if (no.variavel) {
          variaveis[no.variavel] = no.valores?.[acao.opcaoId] ?? acao.opcaoId;
        }
        const prox = no.ramos[acao.opcaoId] ?? no.proximo;
        if (!prox) return { erro: 'Esse botão ainda não leva a lugar nenhum.' };
        return { proximo: prox };
      }

      case 'ESPECIALIDADES': {
        if (acao.tipo !== 'opcao' || !acao.opcaoId) {
          return { erro: 'Escolhe uma das opções pra continuar, por favor. 🙂' };
        }
        const opcoes = await this.opcoesEspecialidade(variaveis, no.especialidadeTipo);
        const escolhida = opcoes.find((o) => o.id === acao.opcaoId);
        if (!escolhida) {
          return { erro: 'Essa opção não está mais disponível. Escolhe outra, por favor.' };
        }
        variaveis.especialidadeId = escolhida.id;
        variaveis._especialidadeNome = escolhida.label;
        return { proximo: no.proximo };
      }

      case 'PERGUNTA_TEXTO': {
        if (acao.tipo !== 'texto') {
          return { erro: 'Me manda essa informação por texto, por favor. ✍️' };
        }
        const r = validarCampo(no.campo, acao.texto ?? '');
        if (!r.ok) return { erro: r.erro };
        variaveis[no.variavel] = r.valor;
        return { proximo: no.proximo };
      }

      case 'UPLOAD': {
        if (acao.tipo !== 'anexo' || !acao.anexoUrl) {
          return { erro: 'Opa! Não recebi o arquivo. Pode enviar de novo, por favor?' };
        }
        const url = acao.anexoUrl;
        const r = await this.analisarUpload(url);

        if (!r.aceitavel) {
          const tentativas = (Number(variaveis._tentativasOcr) || 0) + 1;
          if (tentativas < this.maxTentativasOcr) {
            variaveis._tentativasOcr = tentativas;
            return {
              erro: r.motivo ?? 'A foto ficou difícil de ler. Pode enviar outra mais nítida?',
            };
          }
          // Excedeu o limite: libera, mas marca pra revisão manual do operador.
          variaveis._encaminhamentoIlegivel = true;
        }

        delete variaveis._tentativasOcr;
        variaveis[no.variavel] = url;
        return { proximo: no.proximo };
      }

      default:
        // MENSAGEM/ACAO/FIM não aguardam entrada — não deveriam chegar aqui.
        return { erro: 'Vamos continuar.' };
    }
  }

  /** Caminha pelos nós automáticos até parar num nó que aguarda entrada ou FIM. */
  private async caminhar(
    inicioId: string,
    variaveis: Variaveis,
    mensagens: MensagemSaida[],
    ctx: ContextoConversa,
    fluxo: Fluxo = this.fluxo,
  ): Promise<ResultadoPasso> {
    let noId = inicioId;
    let protocolo: string | undefined;

    // Guarda contra ciclos acidentais no grafo.
    for (let i = 0; i < 50; i++) {
      const no = fluxo.nos[noId];
      if (!no) {
        // Nó inexistente (fluxo do banco mal formado): encerra com segurança.
        this.logger.error(`FlowEngine: nó "${noId}" inexistente no fluxo — encerrando.`);
        return this.parar(
          noId,
          { tipo: 'nenhum' },
          variaveis,
          mensagens,
          'ENCERRADA',
          true,
          protocolo,
        );
      }

      switch (no.tipo) {
        case 'MENSAGEM':
          mensagens.push(...this.resolverTextos(no.textos, variaveis));
          noId = no.proximo;
          continue;

        case 'CONDICAO': {
          const escolhido = String(variaveis._opcao ?? '');
          const prox = no.ramos[escolhido] ?? no.proximoPadrao;
          if (!prox) {
            this.logger.error(`CONDICAO "${noId}": sem ramo para "${escolhido}" — encerrando.`);
            return this.parar(
              noId,
              { tipo: 'nenhum' },
              variaveis,
              mensagens,
              'ENCERRADA',
              true,
              protocolo,
            );
          }
          noId = prox;
          continue;
        }

        case 'ACAO_CRIAR_SOLICITACAO': {
          const criada = await this.executarCriacao(ctx, variaveis);
          variaveis._protocolo = criada.protocolo;
          variaveis._solicitacaoId = criada.id;
          protocolo = criada.protocolo;
          noId = no.proximo;
          continue;
        }

        case 'REDIRECIONAR':
          // Encaminha pro nó referenciado (sem aresta). O limite de passos
          // acima protege contra redirecionamentos em ciclo.
          noId = no.alvo;
          continue;

        case 'ESCOLHA':
          mensagens.push(...this.resolverTextos(no.textos ?? [], variaveis));
          return this.parar(
            noId,
            { tipo: 'opcoes', opcoes: no.opcoes },
            variaveis,
            mensagens,
            'EM_ANDAMENTO',
            false,
            protocolo,
          );

        case 'ESPECIALIDADES': {
          mensagens.push(...this.resolverTextos(no.textos ?? [], variaveis));
          const opcoes = await this.opcoesEspecialidade(variaveis, no.especialidadeTipo);
          if (opcoes.length === 0) {
            mensagens.push({
              texto: 'Não consegui carregar o catálogo agora. Tente de novo em instantes.',
            });
            noId = 'voltar-menu';
            continue;
          }
          return this.parar(
            noId,
            { tipo: 'opcoes', opcoes },
            variaveis,
            mensagens,
            'EM_ANDAMENTO',
            false,
            protocolo,
          );
        }

        case 'PERGUNTA_TEXTO':
          mensagens.push(...this.resolverTextos(no.textos, variaveis));
          return this.parar(
            noId,
            { tipo: 'texto', campo: no.campo },
            variaveis,
            mensagens,
            'EM_ANDAMENTO',
            false,
            protocolo,
          );

        case 'UPLOAD':
          mensagens.push(...this.resolverTextos(no.textos, variaveis));
          return this.parar(
            noId,
            { tipo: 'opcoes', opcoes: [no.opcao] },
            variaveis,
            mensagens,
            'EM_ANDAMENTO',
            false,
            protocolo,
          );

        case 'FIM': {
          mensagens.push(...this.resolverTextos(no.textos ?? [], variaveis));
          const proximaAcao: ProximaAcao = no.opcoesFinais
            ? { tipo: 'opcoes', opcoes: no.opcoesFinais }
            : { tipo: 'nenhum' };
          return this.parar(noId, proximaAcao, variaveis, mensagens, 'ENCERRADA', true, protocolo);
        }
      }
    }

    throw new Error('FlowEngine: limite de passos excedido (possível ciclo no fluxo).');
  }

  private parar(
    noAtual: string,
    proximaAcao: ProximaAcao,
    variaveis: Variaveis,
    mensagens: MensagemSaida[],
    estado: 'EM_ANDAMENTO' | 'ENCERRADA',
    finalizada: boolean,
    protocolo?: string,
  ): ResultadoPasso {
    return { mensagens, proximaAcao, protocolo, finalizada, noAtual, variaveis, estado };
  }

  private async acaoDoNo(no: No, variaveis: Variaveis): Promise<ProximaAcao> {
    switch (no.tipo) {
      case 'ESCOLHA':
        return { tipo: 'opcoes', opcoes: no.opcoes };
      case 'ESPECIALIDADES':
        return {
          tipo: 'opcoes',
          opcoes: await this.opcoesEspecialidade(variaveis, no.especialidadeTipo),
        };
      case 'PERGUNTA_TEXTO':
        return { tipo: 'texto', campo: no.campo };
      case 'UPLOAD':
        return { tipo: 'opcoes', opcoes: [no.opcao] };
      case 'FIM':
        return no.opcoesFinais ? { tipo: 'opcoes', opcoes: no.opcoesFinais } : { tipo: 'nenhum' };
      default:
        return { tipo: 'nenhum' };
    }
  }

  private resolverTextos(textos: Texto[], variaveis: Variaveis): MensagemSaida[] {
    return textos.map((t) => ({
      texto: typeof t === 'function' ? t(variaveis) : t,
    }));
  }

  private async opcoesEspecialidade(
    variaveis: Variaveis,
    override?: 'CONSULTA' | 'EXAME',
  ): Promise<OpcaoFluxo[]> {
    const tipo: TipoEspecialidade = override
      ? TipoEspecialidade[override]
      : variaveis.tipoFluxo === 'exame'
        ? TipoEspecialidade.EXAME
        : TipoEspecialidade.CONSULTA;
    const lista = await this.listarEspecialidades.execute({ tipo, disponivel: true });
    return lista.map((e) => ({ id: e.id, label: e.nome }));
  }

  /**
   * Baixa os bytes do anexo e roda o OCR de triagem. Fail-open: se a URL é
   * externa (não conseguimos baixar) ou o download falha, libera o fluxo.
   */
  private async analisarUpload(url: string): Promise<ResultadoOcr> {
    const key = this.minio.extrairKeyDeUrl(url);
    if (!key) return { aceitavel: true, analisado: false, confianca: 0 };
    try {
      const bytes = await this.minio.baixarBytes(key);
      return await this.ocr.analisar(bytes, this.extDaUrl(url));
    } catch (err) {
      this.logger.error(
        `Não consegui baixar/analisar o anexo (liberando): ${(err as Error).message}`,
      );
      return { aceitavel: true, analisado: false, confianca: 0 };
    }
  }

  private extDaUrl(url: string): string {
    const m = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url);
    return m ? m[1] : '';
  }

  private async executarCriacao(ctx: ContextoConversa, variaveis: Variaveis) {
    const ehConsulta = variaveis.tipoFluxo === 'consulta';
    // Conversa anônima (sem UsuarioMaria) não tem perfil pra copiar: o
    // snapshot do paciente vem SEMPRE das variáveis coletadas (OUTRA).
    const anonima = !ctx.usuarioMariaId;
    const paraQuem = anonima || variaveis.paraQuem === 'OUTRA' ? ParaQuem.OUTRA : ParaQuem.EU;

    // Guarda: numa conversa anônima o ramo "É pra mim mesmo" não coleta
    // nome/CPF (não há perfil) — sem esses dados não dá pra criar a solicitação.
    if (paraQuem === ParaQuem.OUTRA && (!variaveis.nome || !variaveis.cpf)) {
      throw new BadRequestException('Dados do paciente incompletos para criar a solicitação.');
    }

    const dto: CriarSolicitacaoDto = {
      especialidadeId: String(variaveis.especialidadeId),
      paraQuem,
      origem: this.canalParaOrigem(ctx.canal),
      tipoConsulta:
        ehConsulta && variaveis.tipoConsulta ? (variaveis.tipoConsulta as TipoConsulta) : undefined,
      paciente:
        paraQuem === ParaQuem.OUTRA
          ? {
              nome: String(variaveis.nome ?? ''),
              cpf: String(variaveis.cpf ?? ''),
              endereco: String(variaveis.endereco ?? ''),
              // Anônima: na falta do telefone coletado, usa o próprio contato
              // do WhatsApp — é por ele que o gestor fala com o solicitante.
              telefone: String(variaveis.telefone ?? ctx.contatoExterno ?? ''),
            }
          : undefined,
      encaminhamentoUrl: variaveis.encaminhamentoUrl
        ? String(variaveis.encaminhamentoUrl)
        : undefined,
      encaminhamentoIlegivel: variaveis._encaminhamentoIlegivel === true,
    };

    return this.criarSolicitacao.execute(ctx.usuarioMariaId, dto);
  }

  /** Mapeia o canal da conversa para a origem da Solicitacao (1:1). */
  private canalParaOrigem(canal: CanalConversa): OrigemSolicitacao {
    switch (canal) {
      case CanalConversa.APP:
        return OrigemSolicitacao.APP;
      case CanalConversa.WHATSAPP:
        return OrigemSolicitacao.WHATSAPP;
      default:
        return OrigemSolicitacao.WEB;
    }
  }
}
