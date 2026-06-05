import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { mapVersaoDetalhe } from '../fluxo.mapper';
import { FluxoVersaoDetalhe } from '../fluxo.types';

@Injectable()
export class ObterVersaoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(fluxoId: string, numero: number): Promise<FluxoVersaoDetalhe> {
    const fluxo = await this.prisma.fluxoAtendimento.findUnique({
      where: { id: fluxoId },
    });
    if (!fluxo) throw new NotFoundException('Fluxo não encontrado.');

    const versao = await this.prisma.fluxoVersao.findFirst({
      where: { fluxoAtendimentoId: fluxoId, numero },
      include: {
        nos: { orderBy: { criadoEm: 'asc' } },
        arestas: { orderBy: { ordem: 'asc' } },
        variaveis: { orderBy: { chave: 'asc' } },
      },
    });
    if (!versao) throw new NotFoundException('Versão não encontrada.');

    return mapVersaoDetalhe(fluxo, versao);
  }
}
