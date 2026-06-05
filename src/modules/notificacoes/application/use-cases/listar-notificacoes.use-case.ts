import { Injectable } from '@nestjs/common';
import { CanalNotificacao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { NotificacaoResponseDto } from '../dtos/notificacao-response.dto';

/** Inbox in-app do solicitante (canal PUSH), mais recente primeiro. */
@Injectable()
export class ListarNotificacoesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    usuarioMariaId: string,
    pagina = 1,
    limite = 20,
  ): Promise<PaginatedResult<NotificacaoResponseDto> & { naoLidas: number }> {
    const page = pagina > 0 ? pagina : 1;
    const limit = Math.min(limite > 0 ? limite : 20, 100);
    const where = { usuarioMariaId, canal: CanalNotificacao.PUSH };

    const [registros, total, naoLidas] = await this.prisma.$transaction([
      this.prisma.notificacao.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { solicitacao: { select: { protocolo: true } } },
      }),
      this.prisma.notificacao.count({ where }),
      this.prisma.notificacao.count({ where: { ...where, lidaEm: null } }),
    ]);

    return {
      items: registros.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        titulo: n.titulo,
        corpo: n.corpo,
        solicitacaoId: n.solicitacaoId,
        protocolo: n.solicitacao?.protocolo ?? null,
        lidaEm: n.lidaEm,
        criadoEm: n.criadoEm,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      naoLidas,
    };
  }
}
