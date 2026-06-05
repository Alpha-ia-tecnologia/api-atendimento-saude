import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusNotificacao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

@Injectable()
export class MarcarLidaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Marca como lida — só notificações do próprio usuário. */
  async execute(usuarioMariaId: string, notificacaoId: string): Promise<{ lidaEm: Date }> {
    const notificacao = await this.prisma.notificacao.findFirst({
      where: { id: notificacaoId, usuarioMariaId },
      select: { id: true, lidaEm: true },
    });
    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada.');
    }
    if (notificacao.lidaEm) return { lidaEm: notificacao.lidaEm };

    const lidaEm = new Date();
    await this.prisma.notificacao.update({
      where: { id: notificacaoId },
      data: { lidaEm, status: StatusNotificacao.LIDA },
    });
    return { lidaEm };
  }
}
