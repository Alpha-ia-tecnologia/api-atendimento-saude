import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../shared/guards/permissions.guard';
import { Permissions } from '../../../../shared/decorators/permissions.decorator';
import { AuditLogQueryDto } from '../../application/dtos/audit-log-query.dto';
import { ListAuditLogsUseCase } from '../../application/use-cases/list-audit-logs.use-case';
import { GetAuditLogUseCase } from '../../application/use-cases/get-audit-log.use-case';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(
    private readonly listAuditLogsUseCase: ListAuditLogsUseCase,
    private readonly getAuditLogUseCase: GetAuditLogUseCase,
  ) {}

  @Get()
  @Permissions('AUDIT_VIEW')
  @ApiOperation({ summary: 'Listar logs de auditoria' })
  async list(@Query() query: AuditLogQueryDto) {
    const data = await this.listAuditLogsUseCase.execute(query);
    return { message: 'Logs de auditoria listados', data };
  }

  @Get(':id')
  @Permissions('AUDIT_VIEW')
  @ApiOperation({ summary: 'Buscar log de auditoria por ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.getAuditLogUseCase.execute(id);
    return { message: 'Log de auditoria encontrado', data };
  }
}
