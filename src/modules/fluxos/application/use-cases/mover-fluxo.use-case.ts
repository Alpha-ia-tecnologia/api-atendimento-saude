import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { MoverFluxoDto } from '../dtos/mover-fluxo.dto';

/** Salva a posição do card do fluxo no quadro do CRM (compartilhada). */
@Injectable()
export class MoverFluxoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(fluxoId: string, dto: MoverFluxoDto): Promise<{ ok: true }> {
    const existe = await this.prisma.fluxoAtendimento.findUnique({
      where: { id: fluxoId },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Fluxo não encontrado.');

    await this.prisma.fluxoAtendimento.update({
      where: { id: fluxoId },
      data: { posicaoX: dto.posicaoX, posicaoY: dto.posicaoY },
    });
    return { ok: true };
  }
}
