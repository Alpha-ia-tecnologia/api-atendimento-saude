import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { ListarSolicitacoesGestorDto } from '../dtos/listar-solicitacoes-gestor.dto';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class ListarSolicitacoesGestorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async execute(
    filtros: ListarSolicitacoesGestorDto,
  ): Promise<PaginatedResult<SolicitacaoResponseDto>> {
    const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
    const limit = Math.min(filtros.limit && filtros.limit > 0 ? filtros.limit : 20, 100);
    const skip = (page - 1) * limit;

    const where = this.montarWhere(filtros);

    const [registros, total] = await this.prisma.$transaction([
      this.prisma.solicitacao.findMany({
        where,
        include: { especialidade: true, anexos: true, agenteResponsavel: true },
        // Fila FIFO: mais antigas primeiro.
        orderBy: { criadoEm: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.solicitacao.count({ where }),
    ]);

    const items = await Promise.all(registros.map((s) => mapearSolicitacao(s, this.minio)));

    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  private montarWhere(f: ListarSolicitacoesGestorDto): Prisma.SolicitacaoWhereInput {
    const where: Prisma.SolicitacaoWhereInput = {};

    if (f.status) where.status = f.status;
    if (f.especialidadeId) where.especialidadeId = f.especialidadeId;
    if (f.agenteResponsavelCrmId) where.agenteResponsavelCrmId = f.agenteResponsavelCrmId;
    if (f.origem) where.origem = f.origem;

    const protocolo = f.protocolo?.trim();
    if (protocolo) where.protocolo = { contains: protocolo, mode: 'insensitive' };

    if (f.de || f.ate) {
      const criadoEm: Prisma.DateTimeFilter = {};
      if (f.de) {
        const d = new Date(f.de);
        if (!Number.isNaN(d.getTime())) criadoEm.gte = d;
      }
      if (f.ate) {
        const d = new Date(f.ate);
        if (!Number.isNaN(d.getTime())) criadoEm.lte = d;
      }
      if (criadoEm.gte || criadoEm.lte) where.criadoEm = criadoEm;
    }

    const busca = f.busca?.trim();
    if (busca) {
      const digitos = busca.replace(/\D/g, '');
      where.OR = [
        { pacienteNome: { contains: busca, mode: 'insensitive' } },
        { protocolo: { contains: busca, mode: 'insensitive' } },
        ...(digitos ? [{ pacienteCpf: { contains: digitos } }] : []),
      ];
    }

    return where;
  }
}
