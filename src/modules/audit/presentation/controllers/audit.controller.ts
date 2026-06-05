import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PerfilCrm } from '../../../auth-crm/presentation/decorators/perfil-crm.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import { AuditLogQueryDto } from '../../application/dtos/audit-log-query.dto';
import { ListAuditLogsUseCase } from '../../application/use-cases/list-audit-logs.use-case';
import { GetAuditLogUseCase } from '../../application/use-cases/get-audit-log.use-case';

/** Trilha de auditoria do CRM (RF42) — leitura restrita a ADMIN. */
@ApiTags('Auditoria')
@ApiBearerAuth()
@UseGuards(JwtCrmGuard, PerfilGuard)
@PerfilCrm('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(
    private readonly listAuditLogsUseCase: ListAuditLogsUseCase,
    private readonly getAuditLogUseCase: GetAuditLogUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista logs de auditoria (filtros: ação, recurso, período, busca).' })
  async list(@Query() query: AuditLogQueryDto) {
    return this.listAuditLogsUseCase.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um log de auditoria.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getAuditLogUseCase.execute(id);
  }
}
