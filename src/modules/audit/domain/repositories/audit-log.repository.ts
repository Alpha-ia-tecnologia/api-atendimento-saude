import { Prisma } from '@prisma/client';

import { PaginatedResult, PaginationParams } from '../../../../shared/types/pagination';

/** Payload de criação (vem do AUDIT_EVENT — `userId` = operador do CRM). */
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
  usuarioCrmId?: string;
  acao?: string;
  recurso?: string;
  from?: Date;
  to?: Date;
}

/** AuditLog + operador (pra tela mostrar quem fez). */
export type AuditLogComOperador = Prisma.AuditLogGetPayload<{
  include: { usuarioCrm: { select: { nomeCompleto: true; email: true } } };
}>;

export interface AuditLogRepository {
  create(data: CreateAuditLogData): Promise<void>;
  findById(id: string): Promise<AuditLogComOperador | null>;
  findMany(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogComOperador>>;
}
