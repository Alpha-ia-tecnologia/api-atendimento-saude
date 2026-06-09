import { Injectable } from '@nestjs/common';
import { ProvedorCanal, StatusIntegracao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { TestarIntegracaoUseCase } from './testar-integracao.use-case';

export interface StatusCanalDto {
  /** Provedor ativo no momento (null = nenhum configurado/ativado). */
  provedor: ProvedorCanal | null;
  status: StatusIntegracao;
  detalhe: string | null;
  verificadoEm: string | null;
}

/**
 * H9.5 — Status do canal de WhatsApp: verifica AGORA o provedor ativo
 * (chamada real, persistindo o resultado) e devolve o resumo pra tela.
 */
@Injectable()
export class StatusCanalUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly testar: TestarIntegracaoUseCase,
  ) {}

  async execute(): Promise<StatusCanalDto> {
    const ativo = await this.prisma.instanciaCanal.findFirst({ where: { ativo: true } });
    if (!ativo) {
      return {
        provedor: null,
        status: StatusIntegracao.DESCONECTADA,
        detalhe: 'Nenhuma instância padrão ativa.',
        verificadoEm: null,
      };
    }

    try {
      const resultado = await this.testar.execute(ativo.id);
      return {
        provedor: ativo.provedor,
        status: resultado.status,
        detalhe: resultado.detalhe,
        verificadoEm: resultado.verificadoEm,
      };
    } catch (err) {
      return {
        provedor: ativo.provedor,
        status: StatusIntegracao.ERRO,
        detalhe: (err as Error).message,
        verificadoEm: ativo.verificadoEm?.toISOString() ?? null,
      };
    }
  }
}
