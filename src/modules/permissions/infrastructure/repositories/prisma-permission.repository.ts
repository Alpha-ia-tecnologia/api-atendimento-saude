import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  CreatePermissionData,
  PermissionRepository,
} from '../../domain/repositories/permission.repository';
import { PermissionEntity } from '../../domain/entities/permission.entity';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';
import { paginate } from '../../../../shared/utils/pagination.util';
import { PermissionMapper } from '../mappers/permission.mapper';

@Injectable()
export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePermissionData): Promise<PermissionEntity> {
    const created = await this.prisma.permission.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        module: data.module,
        action: data.action,
      },
    });
    return PermissionMapper.toDomain(created);
  }

  async findById(id: string): Promise<PermissionEntity | null> {
    const record = await this.prisma.permission.findUnique({ where: { id } });
    return record ? PermissionMapper.toDomain(record) : null;
  }

  async findByName(name: string): Promise<PermissionEntity | null> {
    const record = await this.prisma.permission.findUnique({ where: { name } });
    return record ? PermissionMapper.toDomain(record) : null;
  }

  async findManyByIds(ids: string[]): Promise<PermissionEntity[]> {
    if (ids.length === 0) return [];
    const records = await this.prisma.permission.findMany({ where: { id: { in: ids } } });
    return records.map(PermissionMapper.toDomain);
  }

  async findMany(filters: PaginationParams): Promise<PaginatedResult<PermissionEntity>> {
    const where: Prisma.PermissionWhereInput = {
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { module: { contains: filters.search, mode: 'insensitive' } },
              { action: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy: filters.sortBy
          ? { [filters.sortBy]: filters.sortOrder ?? 'asc' }
          : { name: 'asc' },
      }),
      this.prisma.permission.count({ where }),
    ]);
    return paginate(items.map(PermissionMapper.toDomain), total, filters);
  }
}
