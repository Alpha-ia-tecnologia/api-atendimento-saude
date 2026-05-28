import { Organization as PrismaOrganization } from '@prisma/client';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { OrganizationResponseDto } from '../../application/dtos/organization-response.dto';

export class OrganizationMapper {
  static toDomain(record: PrismaOrganization): OrganizationEntity {
    return new OrganizationEntity(
      record.id,
      record.name,
      record.document,
      record.status,
      record.createdAt,
      record.updatedAt,
      record.deletedAt,
    );
  }

  static toResponse(entity: OrganizationEntity): OrganizationResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      document: entity.document,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
