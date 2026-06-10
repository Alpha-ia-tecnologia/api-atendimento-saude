import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatusSolicitacao } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class AssumirSolicitacaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** SOLICITADA → EM_ATENDIMENTO, registrando o operador responsável. */
  async execute(id: string, operadorId: string): Promise<SolicitacaoResponseDto> {
    const atual = await this.prisma.solicitacao.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!atual) throw new NotFoundException('Solicitação não encontrada.');

    if (atual.status !== StatusSolicitacao.SOLICITADA) {
      throw new ConflictException(
        'Só é possível assumir solicitações que estão na fila (Solicitada).',
      );
    }

    const atualizada = await this.prisma.solicitacao.update({
      where: { id },
      data: {
        status: StatusSolicitacao.EM_ATENDIMENTO,
        agenteResponsavelCrmId: operadorId,
        assumidaEm: new Date(),
      },
      include: { especialidade: true, anexos: true, agenteResponsavel: true },
    });

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId,
      action: 'SOLICITACAO_ASSUMIDA',
      resource: 'solicitacao',
      resourceId: id,
      metadata: { protocolo: atualizada.protocolo },
    });

    return mapearSolicitacao(atualizada, this.minio);
  }
}
