import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { buildPagination, paginate } from '../../../../shared/utils/pagination.util';
import { ListarUsuariosCrmQueryDto } from '../dtos/listar-usuarios-crm.dto';
import { UsuarioCrmAdminDto } from '../dtos/usuario-crm-admin.dto';
import { toUsuarioCrmAdminDto, usuarioCrmAdminSelect } from '../mappers/usuario-crm.mapper';

@Injectable()
export class ListarUsuariosCrmUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListarUsuariosCrmQueryDto): Promise<PaginatedResult<UsuarioCrmAdminDto>> {
    const params = buildPagination(query);

    const where: Prisma.UsuarioCrmWhereInput = {
      excluidoEm: null,
      ...(query.ativo !== undefined ? { ativo: query.ativo } : {}),
      ...(query.tipoPerfil ? { tipoPerfil: query.tipoPerfil } : {}),
      ...(params.search
        ? {
            OR: [
              { nomeCompleto: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [registros, total] = await this.prisma.$transaction([
      this.prisma.usuarioCrm.findMany({
        where,
        select: usuarioCrmAdminSelect,
        skip: params.skip,
        take: params.limit,
        orderBy: { criadoEm: 'desc' },
      }),
      this.prisma.usuarioCrm.count({ where }),
    ]);

    return paginate(registros.map(toUsuarioCrmAdminDto), total, params);
  }
}
