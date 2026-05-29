import { Injectable } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class ListarMinhasSolicitacoesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async execute(solicitanteId: string): Promise<SolicitacaoResponseDto[]> {
    const solicitacoes = await this.prisma.solicitacao.findMany({
      where: { solicitanteId },
      include: { especialidade: true, anexos: true },
      orderBy: { criadoEm: 'desc' },
    });
    return Promise.all(solicitacoes.map((s) => mapearSolicitacao(s, this.minio)));
  }
}
