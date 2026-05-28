import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesController } from './presentation/controllers/roles.controller';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { GetRoleUseCase } from './application/use-cases/get-role.use-case';
import { UpdateRoleUseCase } from './application/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';
import { AssignPermissionsToRoleUseCase } from './application/use-cases/assign-permissions-to-role.use-case';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository';
import { ROLE_REPOSITORY } from '../../shared/constants/injection-tokens';

@Module({
  imports: [PermissionsModule],
  controllers: [RolesController],
  providers: [
    CreateRoleUseCase,
    ListRolesUseCase,
    GetRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    AssignPermissionsToRoleUseCase,
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
  ],
  exports: [ROLE_REPOSITORY],
})
export class RolesModule {}
