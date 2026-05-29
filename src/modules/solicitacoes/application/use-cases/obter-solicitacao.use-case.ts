import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class ObterSolicitacaoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    solicitanteId: string,
    solicitacaoId: string,
  ): Promise<SolicitacaoResponseDto> {
    // Devolvemos 404 mesmo quando existe mas não pertence ao solicitante,
    // pra não vazar a informação "esse id existe na base".
    const solicitacao = await this.prisma.solicitacao.findFirst({
      where: { id: solicitacaoId, solicitanteId },
      include: { especialidade: true, anexos: true },
    });
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    return mapearSolicitacao(solicitacao);
  }
}
