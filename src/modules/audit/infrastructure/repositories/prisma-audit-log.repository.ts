import { Injectable } from '@nestjs/common';
import { AuditLog as PrismaAuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  AuditLogFilters,
  AuditLogRepository,
  CreateAuditLogData,
} from '../../domain/repositories/audit-log.repository';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { paginate } from '../../../../shared/utils/pagination.util';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogData): Promise<PrismaAuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
  }

  async findById(id: string): Promise<PrismaAuditLog | null> {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }

  async findMany(filters: AuditLogFilters): Promise<PaginatedResult<PrismaAuditLog>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.resource ? { resource: filters.resource } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { action: { contains: filters.search, mode: 'insensitive' } },
              { resource: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy: { createdAt: filters.sortOrder ?? 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(items, total, filters);
  }
}
