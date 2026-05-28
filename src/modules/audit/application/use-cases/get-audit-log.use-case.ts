import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { AuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { AuditLogMapper } from '../../infrastructure/mappers/audit-log.mapper';
import { AuditLogResponseDto } from '../dtos/audit-log-response.dto';

@Injectable()
export class GetAuditLogUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(id: string): Promise<AuditLogResponseDto> {
    const record = await this.auditLogRepository.findById(id);
    if (!record) throw new ResourceNotFoundException('Audit log');
    return AuditLogMapper.toResponse(record);
  }
}
