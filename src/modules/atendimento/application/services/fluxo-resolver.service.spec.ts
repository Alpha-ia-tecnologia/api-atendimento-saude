import { CanalFluxo, StatusFluxoVersao, TipoNoFluxo } from '@prisma/client';

import { FluxoResolverService } from './fluxo-resolver.service';
import { fluxoAtendimentoV1 } from '../flows/atendimento-v1.flow';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

function buildPrisma() {
  return {
    fluxoVersao: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;
}

// Versão mínima materializável: INICIO → FIM.
const VERSAO_BANCO = {
  id: 'versao-1',
  nos: [
    {
      id: 'no-a',
      canal: CanalFluxo.WEB_APP,
      chave: 'inicio',
      tipo: TipoNoFluxo.INICIO,
      conteudo: {},
      ehInicial: true,
    },
    {
      id: 'no-b',
      canal: CanalFluxo.WEB_APP,
      chave: 'fim',
      tipo: TipoNoFluxo.FIM,
      conteudo: { textos: ['Tchau!'] },
      ehInicial: false,
    },
  ],
  arestas: [
    {
      canal: CanalFluxo.WEB_APP,
      noOrigemId: 'no-a',
      noDestinoId: 'no-b',
      condicao: { tipo: 'sempre' },
      ordem: 1,
    },
  ],
};

describe('FluxoResolverService', () => {
  describe('versaoPublicadaDoAtendimento', () => {
    it('busca a única PUBLICADA do sistema, sem filtro por nome de fluxo', async () => {
      const prisma = buildPrisma();
      (prisma.fluxoVersao.findFirst as jest.Mock).mockResolvedValue({ id: 'versao-1' });
      const service = new FluxoResolverService(prisma);

      const versao = await service.versaoPublicadaDoAtendimento();

      expect(versao).toEqual({ id: 'versao-1' });
      expect(prisma.fluxoVersao.findFirst).toHaveBeenCalledWith({
        where: { status: StatusFluxoVersao.PUBLICADA },
        orderBy: { publicadaEm: 'desc' },
        select: { id: true },
      });
    });

    it('retorna null quando nenhum fluxo está publicado', async () => {
      const prisma = buildPrisma();
      (prisma.fluxoVersao.findFirst as jest.Mock).mockResolvedValue(null);
      const service = new FluxoResolverService(prisma);

      expect(await service.versaoPublicadaDoAtendimento()).toBeNull();
    });
  });

  describe('resolverParaConversa', () => {
    it('sem fluxoVersaoId usa o fallback hardcoded', async () => {
      const service = new FluxoResolverService(buildPrisma());

      expect(await service.resolverParaConversa(null)).toBe(fluxoAtendimentoV1);
    });

    it('versão inexistente cai no fallback hardcoded', async () => {
      const prisma = buildPrisma();
      (prisma.fluxoVersao.findUnique as jest.Mock).mockResolvedValue(null);
      const service = new FluxoResolverService(prisma);

      expect(await service.resolverParaConversa('sumiu')).toBe(fluxoAtendimentoV1);
    });

    it('materializa a versão do banco e cacheia por id', async () => {
      const prisma = buildPrisma();
      (prisma.fluxoVersao.findUnique as jest.Mock).mockResolvedValue(VERSAO_BANCO);
      const service = new FluxoResolverService(prisma);

      const fluxo1 = await service.resolverParaConversa('versao-1');
      const fluxo2 = await service.resolverParaConversa('versao-1');

      expect(fluxo1.chave).toBe('versao-1');
      expect(fluxo1.inicial).toBe('fim');
      expect(fluxo2).toBe(fluxo1);
      expect(prisma.fluxoVersao.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
