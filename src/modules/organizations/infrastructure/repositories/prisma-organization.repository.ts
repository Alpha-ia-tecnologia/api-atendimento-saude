import { Injectable } from '@nestjs/common';
import { OrganizationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  CreateOrganizationData,
  OrganizationRepository,
  UpdateOrganizationData,
} from '../../domain/repositories/organization.repository';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';
import { paginate } from '../../../../shared/utils/pagination.util';
import { OrganizationMapper } from '../mappers/organization.mapper';

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrganizationData): Promise<OrganizationEntity> {
    const created = await this.prisma.organization.create({
      data: {
        name: data.name,
        document: data.document ?? null,
        status: data.status ?? OrganizationStatus.ACTIVE,
      },
    });
    return OrganizationMapper.toDomain(created);
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    const record = await this.prisma.organization.findFirst({ where: { id, deletedAt: null } });
    return record ? OrganizationMapper.toDomain(record) : null;
  }

  async findByDocument(document: string): Promise<OrganizationEntity | null> {
    const record = await this.prisma.organization.findFirst({
      where: { document, deletedAt: null },
    });
    return record ? OrganizationMapper.toDomain(record) : null;
  }

  async findMany(filters: PaginationParams): Promise<PaginatedResult<OrganizationEntity>> {
    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status as OrganizationStatus } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { document: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.OrganizationOrderByWithRelationInput = filters.sortBy
      ? { [filters.sortBy]: filters.sortOrder ?? 'desc' }
      : { createdAt: filters.sortOrder ?? 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return paginate(items.map(OrganizationMapper.toDomain), total, filters);
  }

  async update(id: string, data: UpdateOrganizationData): Promise<OrganizationEntity> {
    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.document !== undefined ? { document: data.document } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    return OrganizationMapper.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), status: OrganizationStatus.INACTIVE },
    });
  }
}
