import { Injectable, NotFoundException } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class ObterSolicitacaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async execute(
    solicitanteId: string,
    solicitacaoId: string,
  ): Promise<SolicitacaoResponseDto> {
    const solicitacao = await this.prisma.solicitacao.findFirst({
      where: { id: solicitacaoId, solicitanteId },
      include: { especialidade: true, anexos: true },
    });
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    return mapearSolicitacao(solicitacao, this.minio);
  }
}
