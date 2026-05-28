import { Module } from '@nestjs/common';
import { OrganizationsController } from './presentation/controllers/organizations.controller';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { ListOrganizationsUseCase } from './application/use-cases/list-organizations.use-case';
import { GetOrganizationUseCase } from './application/use-cases/get-organization.use-case';
import { UpdateOrganizationUseCase } from './application/use-cases/update-organization.use-case';
import { ChangeOrganizationStatusUseCase } from './application/use-cases/change-organization-status.use-case';
import { DeleteOrganizationUseCase } from './application/use-cases/delete-organization.use-case';
import { PrismaOrganizationRepository } from './infrastructure/repositories/prisma-organization.repository';
import { ORGANIZATION_REPOSITORY } from '../../shared/constants/injection-tokens';

@Module({
  controllers: [OrganizationsController],
  providers: [
    CreateOrganizationUseCase,
    ListOrganizationsUseCase,
    GetOrganizationUseCase,
    UpdateOrganizationUseCase,
    ChangeOrganizationStatusUseCase,
    DeleteOrganizationUseCase,
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
  ],
  exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationsModule {}
