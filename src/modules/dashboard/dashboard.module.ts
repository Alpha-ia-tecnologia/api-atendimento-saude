import { Module } from '@nestjs/common';

import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { ObterMetricasDashboardUseCase } from './application/use-cases/obter-metricas-dashboard.use-case';
import { DashboardController } from './presentation/controllers/dashboard.controller';

@Module({
  // AuthCrmModule exporta JwtCrmGuard e PerfilGuard usados no controller.
  imports: [AuthCrmModule],
  controllers: [DashboardController],
  providers: [ObterMetricasDashboardUseCase],
})
export class DashboardModule {}
