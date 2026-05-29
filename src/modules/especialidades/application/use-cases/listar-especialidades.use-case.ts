import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { EspecialidadeResponseDto } from '../dtos/especialidade-response.dto';
import { ListarEspecialidadesDto } from '../dtos/listar-especialidades.dto';

@Injectable()
export class ListarEspecialidadesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filtros: ListarEspecialidadesDto): Promise<EspecialidadeResponseDto[]> {
    const especialidades = await this.prisma.especialidade.findMany({
      where: {
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
        ...(filtros.disponivel !== undefined ? { disponivel: filtros.disponivel } : {}),
      },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });

    return especialidades.map((e) => ({
      id: e.id,
      nome: e.nome,
      tipo: e.tipo,
      descricao: e.descricao,
      icone: e.icone,
      disponivel: e.disponivel,
      ordem: e.ordem,
    }));
  }
}
