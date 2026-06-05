import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatusSolicitacao } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { MinioService } from '../../../files/application/services/minio.service';
import { NotificarSolicitacaoService } from '../../../notificacoes/application/services/notificar-solicitacao.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class RecusarSolicitacaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly notificar: NotificarSolicitacaoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** EM_ATENDIMENTO → NAO_APROVADA, com motivo obrigatório. */
  async execute(id: string, operadorId: string, motivo: string): Promise<SolicitacaoResponseDto> {
    const atual = await this.prisma.solicitacao.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!atual) throw new NotFoundException('Solicitação não encontrada.');

    if (atual.status !== StatusSolicitacao.EM_ATENDIMENTO) {
      throw new ConflictException(
        'Assuma o atendimento antes de recusar (a solicitação precisa estar Em atendimento).',
      );
    }

    const atualizada = await this.prisma.solicitacao.update({
      where: { id },
      data: {
        status: StatusSolicitacao.NAO_APROVADA,
        motivoNaoAprovacao: motivo.trim(),
        agenteResponsavelCrmId: operadorId,
      },
      include: { especialidade: true, anexos: true, agenteResponsavel: true },
    });

    // H6.3 — avisa o solicitante com o motivo (inbox in-app + WhatsApp).
    await this.notificar.solicitacaoRecusada(atualizada);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId,
      action: 'SOLICITACAO_RECUSADA',
      resource: 'solicitacao',
      resourceId: id,
      metadata: { protocolo: atualizada.protocolo, motivo: motivo.trim() },
    });

    return mapearSolicitacao(atualizada, this.minio);
  }
}
