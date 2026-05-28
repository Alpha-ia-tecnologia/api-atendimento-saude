import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { AuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { AuditLogQueryDto } from '../dtos/audit-log-query.dto';
import { buildPagination } from '../../../../shared/utils/pagination.util';
import { AuditLogMapper } from '../../infrastructure/mappers/audit-log.mapper';
import { AuditLogResponseDto } from '../dtos/audit-log-response.dto';
import { PaginatedResult } from '../../../../shared/types/pagination';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(query: AuditLogQueryDto): Promise<PaginatedResult<AuditLogResponseDto>> {
    const pagination = buildPagination(query);
    const result = await this.auditLogRepository.findMany({
      ...pagination,
      userId: query.userId,
      action: query.action,
      resource: query.resource,
      from: query.from,
      to: query.to,
    });
    return {
      items: result.items.map(AuditLogMapper.toResponse),
      meta: result.meta,
    };
  }
}
