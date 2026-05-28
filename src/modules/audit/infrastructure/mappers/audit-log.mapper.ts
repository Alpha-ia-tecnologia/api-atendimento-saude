import { AuditLog as PrismaAuditLog } from '@prisma/client';
import { AuditLogResponseDto } from '../../application/dtos/audit-log-response.dto';

export class AuditLogMapper {
  static toResponse(record: PrismaAuditLog): AuditLogResponseDto {
    return {
      id: record.id,
      userId: record.userId,
      action: record.action,
      resource: record.resource,
      resourceId: record.resourceId,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      metadata: record.metadata,
      createdAt: record.createdAt,
    };
  }
}
