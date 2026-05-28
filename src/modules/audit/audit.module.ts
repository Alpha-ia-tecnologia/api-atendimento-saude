import { Module } from '@nestjs/common';
import { AuditController } from './presentation/controllers/audit.controller';
import { ListAuditLogsUseCase } from './application/use-cases/list-audit-logs.use-case';
import { GetAuditLogUseCase } from './application/use-cases/get-audit-log.use-case';
import { AuditListener } from './application/listeners/audit.listener';
import { PrismaAuditLogRepository } from './infrastructure/repositories/prisma-audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from '../../shared/constants/injection-tokens';

@Module({
  controllers: [AuditController],
  providers: [
    ListAuditLogsUseCase,
    GetAuditLogUseCase,
    AuditListener,
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
})
export class AuditModule {}
