import { Module } from '@nestjs/common';

import { TokenMariaService } from './application/services/token-maria.service';
import { LoginMariaUseCase } from './application/use-cases/login-maria.use-case';
import { RegistroMariaUseCase } from './application/use-cases/registro-maria.use-case';
import { AuthMariaController } from './presentation/controllers/auth-maria.controller';
import { JwtMariaGuard } from './presentation/guards/jwt-maria.guard';

@Module({
  controllers: [AuthMariaController],
  providers: [
    TokenMariaService,
    LoginMariaUseCase,
    RegistroMariaUseCase,
    JwtMariaGuard,
  ],
  exports: [TokenMariaService, JwtMariaGuard],
})
export class AuthMariaModule {}
