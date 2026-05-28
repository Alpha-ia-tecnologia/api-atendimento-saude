import { UserStatus } from '@prisma/client';
import { UserEntity } from '../entities/user.entity';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  status?: UserStatus;
  organizationId?: string | null;
  roleIds?: string[];
}

export interface UpdateUserData {
  name?: string;
  organizationId?: string | null;
  status?: UserStatus;
  roleIds?: string[];
}

export interface UserListFilters extends PaginationParams {
  organizationId?: string;
}

export interface UserRepository {
  create(data: CreateUserData): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findWithRolesAndPermissions(id: string): Promise<UserEntity | null>;
  findByEmailWithRolesAndPermissions(email: string): Promise<UserEntity | null>;
  findMany(filters: UserListFilters): Promise<PaginatedResult<UserEntity>>;
  update(id: string, data: UpdateUserData): Promise<UserEntity>;
  softDelete(id: string): Promise<void>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  assignRoles(id: string, roleIds: string[]): Promise<void>;
  updateLastLogin(id: string, when: Date): Promise<void>;
}
