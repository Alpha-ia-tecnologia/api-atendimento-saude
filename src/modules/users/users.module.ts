import { Module } from '@nestjs/common';
import { UsersController } from './presentation/controllers/users.controller';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { ChangeUserStatusUseCase } from './application/use-cases/change-user-status.use-case';
import { ChangeUserPasswordUseCase } from './application/use-cases/change-user-password.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../shared/constants/injection-tokens';
import { PrismaRefreshTokenRepository } from '../auth/infrastructure/repositories/prisma-refresh-token.repository';

@Module({
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    ChangeUserStatusUseCase,
    ChangeUserPasswordUseCase,
    DeleteUserUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
