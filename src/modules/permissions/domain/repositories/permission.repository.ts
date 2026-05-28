import { PermissionEntity } from '../entities/permission.entity';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';

export interface CreatePermissionData {
  name: string;
  description?: string | null;
  module: string;
  action: string;
}

export interface PermissionRepository {
  create(data: CreatePermissionData): Promise<PermissionEntity>;
  findById(id: string): Promise<PermissionEntity | null>;
  findByName(name: string): Promise<PermissionEntity | null>;
  findManyByIds(ids: string[]): Promise<PermissionEntity[]>;
  findMany(filters: PaginationParams): Promise<PaginatedResult<PermissionEntity>>;
}
