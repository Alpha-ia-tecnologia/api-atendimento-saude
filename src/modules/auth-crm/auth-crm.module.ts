import { Module } from '@nestjs/common';

import { TokenCrmService } from './application/services/token-crm.service';
import { LoginCrmUseCase } from './application/use-cases/login-crm.use-case';
import { ListarOperadoresCrmUseCase } from './application/use-cases/listar-operadores-crm.use-case';
import { LogoutCrmUseCase } from './application/use-cases/logout-crm.use-case';
import { ObterPerfilCrmUseCase } from './application/use-cases/obter-perfil-crm.use-case';
import { RefreshCrmUseCase } from './application/use-cases/refresh-crm.use-case';
import { AuthCrmController } from './presentation/controllers/auth-crm.controller';
import { JwtCrmGuard } from './presentation/guards/jwt-crm.guard';
import { PerfilGuard } from './presentation/guards/perfil.guard';

@Module({
  controllers: [AuthCrmController],
  providers: [
    TokenCrmService,
    LoginCrmUseCase,
    RefreshCrmUseCase,
    LogoutCrmUseCase,
    ObterPerfilCrmUseCase,
    ListarOperadoresCrmUseCase,
    JwtCrmGuard,
    PerfilGuard,
  ],
  exports: [TokenCrmService, JwtCrmGuard, PerfilGuard],
})
export class AuthCrmModule {}
