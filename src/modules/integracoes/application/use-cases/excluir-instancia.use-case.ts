import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

/**
 * Exclui uma instância. As conversas vinculadas ficam com `instanciaCanalId`
 * nulo (FK `ON DELETE SET NULL`) — passam a usar a instância padrão. Se a
 * excluída era a padrão, promove a instância mais antiga restante.
 */
@Injectable()
export class ExcluirInstanciaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(instanciaId: string, operadorId?: string): Promise<void> {
    const row = await this.prisma.instanciaCanal.findUnique({ where: { id: instanciaId } });
    if (!row) {
      throw new NotFoundException('Instância não encontrada.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.instanciaCanal.delete({ where: { id: instanciaId } });
      if (row.ativo) {
        const proxima = await tx.instanciaCanal.findFirst({ orderBy: { criadoEm: 'asc' } });
        if (proxima) {
          await tx.instanciaCanal.update({ where: { id: proxima.id }, data: { ativo: true } });
        }
      }
    });

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId ?? null,
      action: 'INTEGRACAO_REMOVIDA',
      resource: 'integracao_canal',
      resourceId: instanciaId,
    });
  }
}
