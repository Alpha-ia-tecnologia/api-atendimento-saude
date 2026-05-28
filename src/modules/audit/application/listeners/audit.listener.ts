import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUDIT_LOG_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { AuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { AUDIT_EVENT, AuditEventPayload } from '../events/audit.event';

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  @OnEvent(AUDIT_EVENT, { async: true })
  async handle(payload: AuditEventPayload): Promise<void> {
    try {
      await this.auditLogRepository.create(payload);
    } catch (err) {
      this.logger.error(
        `Failed to persist audit log for ${payload.action} on ${payload.resource}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
