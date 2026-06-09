import { ConfigService } from '@nestjs/config';
import { createWorker } from 'tesseract.js';

import { OcrEncaminhamentoService } from './ocr-encaminhamento.service';

jest.mock('tesseract.js', () => ({ createWorker: jest.fn() }));

const createWorkerMock = createWorker as unknown as jest.Mock;

/** ConfigService falso: lê de um mapa, com fallback no default passado. */
function buildConfig(overrides: Record<string, string> = {}): ConfigService {
  const valores: Record<string, string> = {
    OCR_HABILITADO: 'true',
    OCR_CONF_MIN: '50',
    OCR_MIN_CHARS: '25',
    OCR_MIN_PALAVRAS: '6',
    // Curto de propósito: o teste de travamento estoura o timeout em ~ms.
    OCR_TIMEOUT_MS: '20',
    ...overrides,
  };
  return {
    get: (chave: string, padrao?: string) => valores[chave] ?? padrao,
  } as unknown as ConfigService;
}

/** Texto que passa em confiança/chars/palavras → imagem aceita. */
const TEXTO_LEGIVEL = 'paciente encaminhamento unidade exame consulta medico solicitacao nascimento';

function fakeWorker(recognize: jest.Mock) {
  return { recognize, terminate: jest.fn().mockResolvedValue(undefined) };
}

const BYTES = Buffer.from('imagem');

describe('OcrEncaminhamentoService', () => {
  beforeEach(() => {
    createWorkerMock.mockReset();
  });

  it('imagem ilegível seguida de OCR travado: faz fail-open e NÃO pendura', async () => {
    const recognize1 = jest
      .fn()
      // 1ª imagem: lida, mas baixa confiança → rejeitada (pede outra foto).
      .mockResolvedValueOnce({ data: { text: 'a b', confidence: 5 } })
      // 2ª imagem: worker travou — promise que nunca assenta.
      .mockReturnValueOnce(new Promise(() => {}));
    const worker1 = fakeWorker(recognize1);
    const worker2 = fakeWorker(jest.fn().mockResolvedValue({ data: { text: TEXTO_LEGIVEL, confidence: 80 } }));
    createWorkerMock.mockResolvedValueOnce(worker1).mockResolvedValueOnce(worker2);

    const service = new OcrEncaminhamentoService(buildConfig());

    // 1ª imagem → rejeitada, fluxo pede outra.
    const r1 = await service.analisar(BYTES, 'jpg');
    expect(r1.aceitavel).toBe(false);
    expect(r1.analisado).toBe(true);

    // 2ª imagem → OCR trava; o timeout libera o fluxo (fail-open) em vez de pendurar.
    const r2 = await service.analisar(BYTES, 'jpg');
    expect(r2.aceitavel).toBe(true);
    expect(r2.analisado).toBe(false);

    // Worker travado foi descartado...
    expect(worker1.terminate).toHaveBeenCalledTimes(1);

    // ...e a 3ª imagem recria um worker novo e volta a funcionar normalmente.
    const r3 = await service.analisar(BYTES, 'jpg');
    expect(r3.aceitavel).toBe(true);
    expect(r3.analisado).toBe(true);
    expect(createWorkerMock).toHaveBeenCalledTimes(2);
  });

  it('recognize que rejeita: fail-open e recria o worker na imagem seguinte', async () => {
    const workerA = fakeWorker(jest.fn().mockRejectedValue(new Error('decode falhou')));
    const workerB = fakeWorker(jest.fn().mockResolvedValue({ data: { text: TEXTO_LEGIVEL, confidence: 80 } }));
    createWorkerMock.mockResolvedValueOnce(workerA).mockResolvedValueOnce(workerB);

    const service = new OcrEncaminhamentoService(buildConfig());

    const r1 = await service.analisar(BYTES, 'jpg');
    expect(r1.aceitavel).toBe(true);
    expect(r1.analisado).toBe(false);
    expect(workerA.terminate).toHaveBeenCalledTimes(1);

    const r2 = await service.analisar(BYTES, 'jpg');
    expect(r2.analisado).toBe(true);
    expect(createWorkerMock).toHaveBeenCalledTimes(2);
  });

  it('OCR desligado libera sem analisar', async () => {
    const service = new OcrEncaminhamentoService(buildConfig({ OCR_HABILITADO: 'false' }));
    const r = await service.analisar(BYTES, 'jpg');
    expect(r).toEqual({ aceitavel: true, analisado: false, confianca: 0 });
    expect(createWorkerMock).not.toHaveBeenCalled();
  });

  it('formato não-raster (pdf) libera sem analisar', async () => {
    const service = new OcrEncaminhamentoService(buildConfig());
    const r = await service.analisar(BYTES, 'pdf');
    expect(r.aceitavel).toBe(true);
    expect(r.analisado).toBe(false);
    expect(createWorkerMock).not.toHaveBeenCalled();
  });
});
