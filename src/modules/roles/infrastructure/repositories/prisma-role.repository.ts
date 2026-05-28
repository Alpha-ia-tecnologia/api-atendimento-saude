import { Injectable } from '@nestjs/common';
import { Prisma, RoleStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  CreateRoleData,
  RoleRepository,
  UpdateRoleData,
} from '../../domain/repositories/role.repository';
import { RoleEntity } from '../../domain/entities/role.entity';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';
import { paginate } from '../../../../shared/utils/pagination.util';
import { RoleMapper } from '../mappers/role.mapper';

const includePermissions = {
  permissions: { include: { permission: true } },
} satisfies Prisma.RoleInclude;

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRoleData): Promise<RoleEntity> {
    const created = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        status: data.status ?? RoleStatus.ACTIVE,
        ...(data.permissionIds && data.permissionIds.length
          ? {
              permissions: {
                create: data.permissionIds.map((permissionId) => ({ permissionId })),
              },
            }
          : {}),
      },
      include: includePermissions,
    });
    return RoleMapper.toDomain(created);
  }

  async findById(id: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: includePermissions,
    });
    return record ? RoleMapper.toDomain(record) : null;
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: { name, deletedAt: null },
      include: includePermissions,
    });
    return record ? RoleMapper.toDomain(record) : null;
  }

  async findMany(filters: PaginationParams): Promise<PaginatedResult<RoleEntity>> {
    const where: Prisma.RoleWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status as RoleStatus } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        include: includePermissions,
        skip: filters.skip,
        take: filters.limit,
        orderBy: filters.sortBy
          ? { [filters.sortBy]: filters.sortOrder ?? 'asc' }
          : { name: 'asc' },
      }),
      this.prisma.role.count({ where }),
    ]);
    return paginate(items.map(RoleMapper.toDomain), total, filters);
  }

  async update(id: string, data: UpdateRoleData): Promise<RoleEntity> {
    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: includePermissions,
    });
    return RoleMapper.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date(), status: RoleStatus.INACTIVE },
    });
  }

  async assignPermissions(id: string, permissionIds: string[]): Promise<RoleEntity> {
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      skipDuplicates: true,
    });
    const record = await this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: includePermissions,
    });
    return RoleMapper.toDomain(record);
  }
}
