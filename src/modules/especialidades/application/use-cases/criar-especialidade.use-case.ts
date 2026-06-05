import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CriarEspecialidadeDto } from '../dtos/criar-especialidade.dto';
import { EspecialidadeResponseDto } from '../dtos/especialidade-response.dto';
import { mapEspecialidade } from '../especialidade.mapper';

@Injectable()
export class CriarEspecialidadeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CriarEspecialidadeDto): Promise<EspecialidadeResponseDto> {
    try {
      const e = await this.prisma.especialidade.create({
        data: {
          nome: dto.nome.trim(),
          tipo: dto.tipo,
          descricao: dto.descricao?.trim() || null,
          icone: dto.icone?.trim() || null,
          disponivel: dto.disponivel ?? true,
          ordem: dto.ordem ?? 0,
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
