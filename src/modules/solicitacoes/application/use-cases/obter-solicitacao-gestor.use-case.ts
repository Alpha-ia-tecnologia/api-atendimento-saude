import { Injectable, NotFoundException } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class ObterSolicitacaoGestorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  /** Detalhe para o gestor — sem checagem de posse (qualquer solicitação). */
  async execute(id: string): Promise<SolicitacaoResponseDto> {
    const solicitacao = await this.prisma.solicitacao.findUnique({
      where: { id },
      include: { especialidade: true, anexos: true, agenteResponsavel: true },
    });
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    return mapearSolicitacao(solicitacao, this.minio);
  }
}
