import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class ListarMinhasSolicitacoesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(solicitanteId: string): Promise<SolicitacaoResponseDto[]> {
    const solicitacoes = await this.prisma.solicitacao.findMany({
      where: { solicitanteId },
      include: { especialidade: true, anexos: true },
      orderBy: { criadoEm: 'desc' },
    });
    return solicitacoes.map(mapearSolicitacao);
  }
}
