import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { ConversaResumoDto } from '../dtos/conversa-response.dto';
import { ListarConversasGestorDto } from '../dtos/listar-conversas-gestor.dto';
import { mapearConversaResumo } from '../mappers/conversa.mapper';

@Injectable()
export class ListarConversasGestorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filtros: ListarConversasGestorDto): Promise<PaginatedResult<ConversaResumoDto>> {
    const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
    const limit = Math.min(filtros.limit && filtros.limit > 0 ? filtros.limit : 20, 100);
    const skip = (page - 1) * limit;

    const where = this.montarWhere(filtros);

    const [registros, total] = await this.prisma.$transaction([
      this.prisma.conversa.findMany({
        where,
        include: {
          usuarioMaria: { select: { nome: true, cpf: true, fotoPerfilUrl: true } },
          solicitacao: { select: { protocolo: true } },
          // Só a última mensagem, pra prévia na lista.
          mensagens: { orderBy: { criadoEm: 'desc' }, take: 1 },
        },
        // Inbox: conversa com atividade mais recente no topo.
        orderBy: { ultimaInteracaoEm: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversa.count({ where }),
    ]);

    return {
      items: registros.map((c) => mapearConversaResumo(c)),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  private montarWhere(f: ListarConversasGestorDto): Prisma.ConversaWhereInput {
    const where: Prisma.ConversaWhereInput = {};

    if (f.estado) where.estado = f.estado;
    if (f.canal) where.canal = f.canal;

    // Filtro dedicado de protocolo (solicitação vinculada).
    const protocolo = f.protocolo?.trim();
    if (protocolo) {
      where.solicitacao = { protocolo: { contains: protocolo, mode: 'insensitive' } };
    }

    // Busca por nome/CPF do solicitante ou telefone da conversa anônima.
    const busca = f.busca?.trim();
    if (busca) {
      const digitos = busca.replace(/\D/g, '');
      where.OR = [
        { usuarioMaria: { nome: { contains: busca, mode: 'insensitive' } } },
        ...(digitos
          ? [
              { usuarioMaria: { cpf: { contains: digitos } } },
              { contatoExterno: { contains: digitos } },
            ]
          : []),
      ];
    }

    return where;
  }
}
