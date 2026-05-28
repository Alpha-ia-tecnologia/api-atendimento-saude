import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { TokenService } from './application/services/token.service';
import { REFRESH_TOKEN_REPOSITORY } from '../../shared/constants/injection-tokens';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    TokenService,
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
  ],
  exports: [REFRESH_TOKEN_REPOSITORY],
})
export class AuthModule {}
