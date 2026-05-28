import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { UserEntity } from '../../domain/entities/user.entity';
import {
  CreateUserData,
  UpdateUserData,
  UserListFilters,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { paginate } from '../../../../shared/utils/pagination.util';
import { UserMapper } from '../mappers/user.mapper';

const includeRolesAndPermissions = {
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        status: data.status ?? UserStatus.ACTIVE,
        organizationId: data.organizationId ?? null,
        ...(data.roleIds && data.roleIds.length
          ? { roles: { create: data.roleIds.map((roleId) => ({ roleId })) } }
          : {}),
      },
      include: includeRolesAndPermissions,
    });
    return UserMapper.toDomain(created);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: includeRolesAndPermissions,
    });
    return record ? UserMapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: includeRolesAndPermissions,
    });
    return record ? UserMapper.toDomain(record) : null;
  }

  async findWithRolesAndPermissions(id: string): Promise<UserEntity | null> {
    return this.findById(id);
  }

  async findByEmailWithRolesAndPermissions(email: string): Promise<UserEntity | null> {
    return this.findByEmail(email);
  }

  async findMany(filters: UserListFilters): Promise<PaginatedResult<UserEntity>> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status as UserStatus } : {}),
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput = filters.sortBy
      ? { [filters.sortBy]: filters.sortOrder ?? 'desc' }
      : { createdAt: filters.sortOrder ?? 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: includeRolesAndPermissions,
        skip: filters.skip,
        take: filters.limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items.map(UserMapper.toDomain), total, filters);
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    if (data.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.organizationId !== undefined ? { organizationId: data.organizationId } : {}),
        ...(data.roleIds
          ? { roles: { create: data.roleIds.map((roleId) => ({ roleId })) } }
          : {}),
      },
      include: includeRolesAndPermissions,
    });
    return UserMapper.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async assignRoles(id: string, roleIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      }),
    ]);
  }

  async updateLastLogin(id: string, when: Date): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: when } });
  }
}
