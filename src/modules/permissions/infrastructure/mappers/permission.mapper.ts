import { Permission as PrismaPermission } from '@prisma/client';
import { PermissionEntity } from '../../domain/entities/permission.entity';
import { PermissionResponseDto } from '../../application/dtos/permission-response.dto';

export class PermissionMapper {
  static toDomain(record: PrismaPermission): PermissionEntity {
    return new PermissionEntity(
      record.id,
      record.name,
      record.description,
      record.module,
      record.action,
      record.createdAt,
      record.updatedAt,
    );
  }

  static toResponse(entity: PermissionEntity): PermissionResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      module: entity.module,
      action: entity.action,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
