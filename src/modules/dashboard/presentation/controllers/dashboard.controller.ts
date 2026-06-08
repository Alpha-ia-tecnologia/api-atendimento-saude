import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TipoPerfilCrm } from '@prisma/client';

import { PerfilCrm } from '../../../auth-crm/presentation/decorators/perfil-crm.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import { MetricasDashboardDto } from '../../application/dtos/metricas-dashboard.dto';
import { MetricasDashboardQueryDto } from '../../application/dtos/metricas-dashboard-query.dto';
import { ObterMetricasDashboardUseCase } from '../../application/use-cases/obter-metricas-dashboard.use-case';

@ApiTags('Dashboard (gestor)')
@ApiBearerAuth()
@UseGuards(JwtCrmGuard, PerfilGuard)
@PerfilCrm(TipoPerfilCrm.ADMIN, TipoPerfilCrm.SUPERVISOR)
@Controller('gestor/dashboard')
export class DashboardController {
  constructor(private readonly obterMetricas: ObterMetricasDashboardUseCase) {}

  @Get('metricas')
  @ApiOperation({
    summary: 'Métricas do CRM (RF37): status, especialidade, período, origem, etc.',
  })
  @ApiOkResponse({ type: MetricasDashboardDto })
  async metricas(@Query() query: MetricasDashboardQueryDto): Promise<MetricasDashboardDto> {
    return this.obterMetricas.execute(query);
  }
}
