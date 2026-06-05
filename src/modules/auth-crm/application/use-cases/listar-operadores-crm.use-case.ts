import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

export interface OperadorResumo {
  id: string;
  nomeCompleto: string;
}

@Injectable()
export class ListarOperadoresCrmUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Operadores ativos do CRM (id + nome), para popular filtros/atribuições. */
  async execute(): Promise<OperadorResumo[]> {
    const operadores = await this.prisma.usuarioCrm.findMany({
      where: { ativo: true, excluidoEm: null },
      select: { id: true, nomeCompleto: true },
      orderBy: { nomeCompleto: 'asc' },
    });
    return operadores;
  }
}
