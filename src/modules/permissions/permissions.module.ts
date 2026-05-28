import { Module } from '@nestjs/common';
import { PermissionsController } from './presentation/controllers/permissions.controller';
import { CreatePermissionUseCase } from './application/use-cases/create-permission.use-case';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case';
import { GetPermissionUseCase } from './application/use-cases/get-permission.use-case';
import { PrismaPermissionRepository } from './infrastructure/repositories/prisma-permission.repository';
import { PERMISSION_REPOSITORY } from '../../shared/constants/injection-tokens';

@Module({
  controllers: [PermissionsController],
  providers: [
    CreatePermissionUseCase,
    ListPermissionsUseCase,
    GetPermissionUseCase,
    { provide: PERMISSION_REPOSITORY, useClass: PrismaPermissionRepository },
  ],
  exports: [PERMISSION_REPOSITORY],
})
export class PermissionsModule {}
