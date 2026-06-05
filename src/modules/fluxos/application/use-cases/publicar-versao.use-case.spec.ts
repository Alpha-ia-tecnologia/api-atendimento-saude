import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusFluxoVersao, TipoNoFluxo } from '@prisma/client';

import { PublicarVersaoUseCase } from './publicar-versao.use-case';
import { ObterVersaoUseCase } from './obter-versao.use-case';
import { ValidarFluxoUseCase } from './validar-fluxo.use-case';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

const VERSAO_RASCUNHO = {
  id: 'versao-2',
  fluxoAtendimentoId: 'fluxo-b',
  numero: 2,
  status: StatusFluxoVersao.RASCUNHO,
  nos: [
    {
      id: 'no-1',
      chave: 'inicio',
      tipo: TipoNoFluxo.INICIO,
      ehInicial: true,
      conteudo: {},
    },
  ],
  arestas: [],
  variaveis: [],
};

function buildPrisma() {
  return {
    fluxoVersao: {
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue(undefined),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
}

function buildUseCase(prisma: PrismaService, valido = true) {
  const validar = {
    execute: jest
      .fn()
      .mockReturnValue(
        valido
          ? { valido: true, problemas: [] }
          : { valido: false, problemas: ['Nenhum nó inicial definido.'] },
      ),
  } as unknown as ValidarFluxoUseCase;
  const obter = {
    execute: jest.fn().mockResolvedValue({ id: 'versao-2', numero: 2 }),
  } as unknown as ObterVersaoUseCase;
  const eventEmitter = {
    emit: jest.fn(),
  } as unknown as import('@nestjs/event-emitter').EventEmitter2;
  return new PublicarVersaoUseCase(prisma, validar, obter, eventEmitter);
}

describe('PublicarVersaoUseCase', () => {
  it('arquiva a publicada de QUALQUER fluxo (sem filtro por fluxoAtendimentoId)', async () => {
    const prisma = buildPrisma();
    (prisma.fluxoVersao.findFirst as jest.Mock).mockResolvedValue(VERSAO_RASCUNHO);
    const useCase = buildUseCase(prisma);

    await useCase.execute('fluxo-b', 2);

    expect(prisma.fluxoVersao.updateMany).toHaveBeenCalledWith({
      where: { status: StatusFluxoVersao.PUBLICADA },
      data: { status: StatusFluxoVersao.ARQUIVADA },
    });
    expect(prisma.fluxoVersao.update).toHaveBeenCalledWith({
      where: { id: 'versao-2' },
      data: {
        status: StatusFluxoVersao.PUBLICADA,
        publicadaEm: expect.any(Date),
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('lança NotFound quando a versão não existe', async () => {
    const prisma = buildPrisma();
    (prisma.fluxoVersao.findFirst as jest.Mock).mockResolvedValue(null);
    const useCase = buildUseCase(prisma);

    await expect(useCase.execute('fluxo-b', 99)).rejects.toThrow(NotFoundException);
  });

  it('lança BadRequest quando a versão já é a publicada', async () => {
    const prisma = buildPrisma();
    (prisma.fluxoVersao.findFirst as jest.Mock).mockResolvedValue({
      ...VERSAO_RASCUNHO,
      status: StatusFluxoVersao.PUBLICADA,
    });
    const useCase = buildUseCase(prisma);

    await expect(useCase.execute('fluxo-b', 2)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lança BadRequest com problemas quando a validação falha, sem tocar o banco', async () => {
    const prisma = buildPrisma();
    (prisma.fluxoVersao.findFirst as jest.Mock).mockResolvedValue(VERSAO_RASCUNHO);
    const useCase = buildUseCase(prisma, false);

    await expect(useCase.execute('fluxo-b', 2)).rejects.toMatchObject({
      response: expect.objectContaining({
        problemas: ['Nenhum nó inicial definido.'],
      }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
