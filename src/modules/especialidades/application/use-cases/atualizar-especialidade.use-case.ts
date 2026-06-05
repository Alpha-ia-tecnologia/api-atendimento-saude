import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { AtualizarEspecialidadeDto } from '../dtos/atualizar-especialidade.dto';
import { EspecialidadeResponseDto } from '../dtos/especialidade-response.dto';
import { mapEspecialidade } from '../especialidade.mapper';

@Injectable()
export class AtualizarEspecialidadeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, dto: AtualizarEspecialidadeDto): Promise<EspecialidadeResponseDto> {
    const existe = await this.prisma.especialidade.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Especialidade não encontrada.');

    try {
      const e = await this.prisma.especialidade.update({
        where: { id },
        data: {
          ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.descricao !== undefined ? { descricao: dto.descricao?.trim() || null } : {}),
          ...(dto.icone !== undefined ? { icone: dto.icone?.trim() || null } : {}),
          ...(dto.disponivel !== undefined ? { disponivel: dto.disponivel } : {}),
          ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
        },
      });
      return mapEspecialidade(e);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Já existe uma especialidade com esse nome.');
      }
      throw err;
    }
  }
}
