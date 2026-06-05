import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProvedorCanal } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

/**
 * Define o provedor ativo: marca `ativo=true` no escolhido e `false` nos
 * demais (transação). Só permite ativar um provedor já configurado.
 */
@Injectable()
export class AtivarIntegracaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(provedor: ProvedorCanal, operadorId?: string): Promise<void> {
    const alvo = await this.prisma.integracaoCanal.findUnique({
      where: { provedor },
    });
    if (!alvo?.credenciaisCifradas) {
      throw new BadRequestException('Configure as credenciais deste provedor antes de ativá-lo.');
    }

    await this.prisma.$transaction([
      this.prisma.integracaoCanal.updateMany({
        where: { provedor: { not: provedor } },
        data: { ativo: false },
      }),
      this.prisma.integracaoCanal.update({
        where: { provedor },
        data: { ativo: true },
      }),
    ]);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId ?? null,
      action: 'INTEGRACAO_ATIVADA',
      resource: 'integracao_canal',
      resourceId: provedor,
    });
  }
}
