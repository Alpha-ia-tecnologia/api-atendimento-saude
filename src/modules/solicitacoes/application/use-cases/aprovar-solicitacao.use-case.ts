import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatusSolicitacao } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { MinioService } from '../../../files/application/services/minio.service';
import { NotificarSolicitacaoService } from '../../../notificacoes/application/services/notificar-solicitacao.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

interface AprovarParams {
  /** URL do PDF do SISREG já enviado ao MinIO (obrigatório). */
  pdfUrl: string;
  /** Data/hora do agendamento (obrigatória). */
  dataAgendada: Date;
}

@Injectable()
export class AprovarSolicitacaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly notificar: NotificarSolicitacaoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** EM_ATENDIMENTO → AGENDADA, anexando o PDF do agendamento. */
  async execute(
    id: string,
    operadorId: string,
    params: AprovarParams,
  ): Promise<SolicitacaoResponseDto> {
    const atual = await this.prisma.solicitacao.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!atual) throw new NotFoundException('Solicitação não encontrada.');

    if (atual.status !== StatusSolicitacao.EM_ATENDIMENTO) {
      throw new ConflictException(
        'Assuma o atendimento antes de aprovar (a solicitação precisa estar Em atendimento).',
      );
    }

    const atualizada = await this.prisma.solicitacao.update({
      where: { id },
      data: {
        status: StatusSolicitacao.AGENDADA,
        agendamentoPdfUrl: params.pdfUrl,
        dataAgendada: params.dataAgendada,
        agenteResponsavelCrmId: operadorId,
        aprovadaEm: new Date(),
      },
      include: { especialidade: true, anexos: true, agenteResponsavel: true },
    });

    // H6.3 — avisa o solicitante (inbox in-app + WhatsApp). Nunca lança.
    await this.notificar.solicitacaoAgendada(atualizada);

    // B3 — envia o comprovante (PDF) pela conversa de WhatsApp vinculada. Nunca lança.
    await this.notificar.enviarPdfAgendamento(id);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId,
      action: 'SOLICITACAO_APROVADA',
      resource: 'solicitacao',
      resourceId: id,
      metadata: { protocolo: atualizada.protocolo, dataAgendada: params.dataAgendada },
    });

    return mapearSolicitacao(atualizada, this.minio);
  }
}
