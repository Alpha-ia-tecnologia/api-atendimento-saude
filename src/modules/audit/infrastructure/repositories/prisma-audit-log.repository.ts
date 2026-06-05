import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  AuditLogComOperador,
  AuditLogFilters,
  AuditLogRepository,
  CreateAuditLogData,
} from '../../domain/repositories/audit-log.repository';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { paginate } from '../../../../shared/utils/pagination.util';

const INCLUDE_OPERADOR = {
  usuarioCrm: { select: { nomeCompleto: true, email: true } },
} as const;

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        usuarioCrmId: data.userId ?? null,
        acao: data.action,
        recurso: data.resource,
        recursoId: data.resourceId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  }

  async findById(id: string): Promise<AuditLogComOperador | null> {
    return this.prisma.auditLog.findUnique({ where: { id }, include: INCLUDE_OPERADOR });
  }

  async findMany(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogComOperador>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.usuarioCrmId ? { usuarioCrmId: filters.usuarioCrmId } : {}),
      ...(filters.acao ? { acao: filters.acao } : {}),
      ...(filters.recurso ? { recurso: filters.recurso } : {}),
      ...(filters.from || filters.to
        ? {
            criadoEm: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { acao: { contains: filters.search, mode: 'insensitive' } },
              { recurso: { contains: filters.search, mode: 'insensitive' } },
              { recursoId: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy: { criadoEm: filters.sortOrder ?? 'desc' },
        include: INCLUDE_OPERADOR,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(items, total, filters);
  }
}
