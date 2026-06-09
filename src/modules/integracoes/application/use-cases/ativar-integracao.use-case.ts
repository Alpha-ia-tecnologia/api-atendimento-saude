import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

/**
 * Define a instância PADRÃO global: marca `ativo=true` na escolhida e `false`
 * em todas as outras (transação). Só permite uma instância já configurada.
 */
@Injectable()
export class AtivarIntegracaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(instanciaId: string, operadorId?: string): Promise<void> {
    const alvo = await this.prisma.instanciaCanal.findUnique({ where: { id: instanciaId } });
    if (!alvo) {
      throw new NotFoundException('Instância não encontrada.');
    }
    if (!alvo.credenciaisCifradas) {
      throw new BadRequestException('Configure as credenciais desta instância antes de ativá-la.');
    }

    await this.prisma.$transaction([
      this.prisma.instanciaCanal.updateMany({
        where: { id: { not: instanciaId } },
        data: { ativo: false },
      }),
      this.prisma.instanciaCanal.update({
        where: { id: instanciaId },
        data: { ativo: true },
      }),
    ]);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId ?? null,
      action: 'INTEGRACAO_ATIVADA',
      resource: 'integracao_canal',
      resourceId: instanciaId,
    });
  }
}
