import { Role as PrismaRole, RolePermission, Permission } from '@prisma/client';
import { RoleEntity } from '../../domain/entities/role.entity';
import { RoleResponseDto } from '../../application/dtos/role-response.dto';

type PrismaRoleWithPermissions = PrismaRole & {
  permissions?: Array<RolePermission & { permission: Permission }>;
};

export class RoleMapper {
  static toDomain(record: PrismaRoleWithPermissions): RoleEntity {
    const permissions = record.permissions?.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
    })) ?? [];
    return new RoleEntity(
      record.id,
      record.name,
      record.description,
      record.status,
      record.createdAt,
      record.updatedAt,
      record.deletedAt,
      permissions,
    );
  }

  static toResponse(entity: RoleEntity): RoleResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      permissions: entity.permissions,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
