import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { mapFluxoResumo } from '../fluxo.mapper';
import { FluxoResumo } from '../fluxo.types';

@Injectable()
export class ListarFluxosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<FluxoResumo[]> {
    const fluxos = await this.prisma.fluxoAtendimento.findMany({
      include: { versoes: true },
      orderBy: { criadoEm: 'asc' },
    });
    return fluxos.map(mapFluxoResumo);
  }
}
