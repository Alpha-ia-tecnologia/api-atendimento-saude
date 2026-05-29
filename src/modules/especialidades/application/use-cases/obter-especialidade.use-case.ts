import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { EspecialidadeResponseDto } from '../dtos/especialidade-response.dto';

@Injectable()
export class ObterEspecialidadeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<EspecialidadeResponseDto> {
    const e = await this.prisma.especialidade.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Especialidade não encontrada.');
    return {
      id: e.id,
      nome: e.nome,
      tipo: e.tipo,
      descricao: e.descricao,
      icone: e.icone,
      disponivel: e.disponivel,
      ordem: e.ordem,
    };
  }
}
