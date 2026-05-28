import { User as PrismaUser, UserRole, Role, RolePermission, Permission } from '@prisma/client';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserResponseDto } from '../../application/dtos/user-response.dto';

type PrismaUserWithRoles = PrismaUser & {
  roles?: Array<
    UserRole & { role: Role & { permissions?: Array<RolePermission & { permission: Permission }> } }
  >;
};

export class UserMapper {
  static toDomain(record: PrismaUserWithRoles): UserEntity {
    const roles =
      record.roles?.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.permissions?.map((rp) => rp.permission.name) ?? [],
      })) ?? [];

    return new UserEntity(
      record.id,
      record.name,
      record.email,
      record.passwordHash,
      record.status,
      record.organizationId,
      record.lastLoginAt,
      record.createdAt,
      record.updatedAt,
      record.deletedAt,
      roles,
    );
  }

  static toResponse(entity: UserEntity): UserResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      status: entity.status,
      organizationId: entity.organizationId,
      roles: entity.roles.map((r) => ({ id: r.id, name: r.name })),
      lastLoginAt: entity.lastLoginAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
