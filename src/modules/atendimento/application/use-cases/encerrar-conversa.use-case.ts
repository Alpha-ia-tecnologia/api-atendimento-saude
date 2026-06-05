import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoConversa } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ConversaDetalheDto } from '../dtos/conversa-response.dto';
import { ObterConversaGestorUseCase } from './obter-conversa-gestor.use-case';

@Injectable()
export class EncerrarConversaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obter: ObterConversaGestorUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(conversaId: string, operadorId?: string): Promise<ConversaDetalheDto> {
    const conversa = await this.prisma.conversa.findUnique({
      where: { id: conversaId },
      select: { id: true },
    });
    if (!conversa) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    await this.prisma.conversa.update({
      where: { id: conversaId },
      data: { estado: EstadoConversa.ENCERRADA, encerradaEm: new Date() },
    });

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId ?? null,
      action: 'CONVERSA_ENCERRADA',
      resource: 'conversa',
      resourceId: conversaId,
    });

    return this.obter.execute(conversaId);
  }
}
