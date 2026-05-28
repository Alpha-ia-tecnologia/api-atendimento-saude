export const AUDIT_EVENT = 'audit.log';

export interface AuditEventPayload {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
