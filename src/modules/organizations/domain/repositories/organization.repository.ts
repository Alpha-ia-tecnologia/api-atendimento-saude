import { OrganizationStatus } from '@prisma/client';
import { OrganizationEntity } from '../entities/organization.entity';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';

export interface CreateOrganizationData {
  name: string;
  document?: string | null;
  status?: OrganizationStatus;
}

export interface UpdateOrganizationData {
  name?: string;
  document?: string | null;
  status?: OrganizationStatus;
}

export interface OrganizationRepository {
  create(data: CreateOrganizationData): Promise<OrganizationEntity>;
  findById(id: string): Promise<OrganizationEntity | null>;
  findByDocument(document: string): Promise<OrganizationEntity | null>;
  findMany(filters: PaginationParams): Promise<PaginatedResult<OrganizationEntity>>;
  update(id: string, data: UpdateOrganizationData): Promise<OrganizationEntity>;
  softDelete(id: string): Promise<void>;
}
