import { RoleStatus } from '@prisma/client';
import { RoleEntity } from '../entities/role.entity';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';

export interface CreateRoleData {
  name: string;
  description?: string | null;
  status?: RoleStatus;
  permissionIds?: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string | null;
  status?: RoleStatus;
}

export interface RoleRepository {
  create(data: CreateRoleData): Promise<RoleEntity>;
  findById(id: string): Promise<RoleEntity | null>;
  findByName(name: string): Promise<RoleEntity | null>;
  findMany(filters: PaginationParams): Promise<PaginatedResult<RoleEntity>>;
  update(id: string, data: UpdateRoleData): Promise<RoleEntity>;
  softDelete(id: string): Promise<void>;
  assignPermissions(id: string, permissionIds: string[]): Promise<RoleEntity>;
}
