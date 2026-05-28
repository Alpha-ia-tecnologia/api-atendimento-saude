import { AuditLog as PrismaAuditLog } from '@prisma/client';
import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';

export interface CreateAuditLogData {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogFilters extends PaginationParams {
  userId?: string;
  action?: string;
  resource?: string;
  from?: Date;
  to?: Date;
}

export interface AuditLogRepository {
  create(data: CreateAuditLogData): Promise<PrismaAuditLog>;
  findById(id: string): Promise<PrismaAuditLog | null>;
  findMany(filters: AuditLogFilters): Promise<PaginatedResult<PrismaAuditLog>>;
}
