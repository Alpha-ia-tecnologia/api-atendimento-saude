import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../shared/guards/permissions.guard';
import { Permissions } from '../../../../shared/decorators/permissions.decorator';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../shared/types/authenticated-user';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';
import { CreateOrganizationDto } from '../../application/dtos/create-organization.dto';
import { UpdateOrganizationDto } from '../../application/dtos/update-organization.dto';
import { ChangeOrganizationStatusDto } from '../../application/dtos/change-organization-status.dto';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { ListOrganizationsUseCase } from '../../application/use-cases/list-organizations.use-case';
import { GetOrganizationUseCase } from '../../application/use-cases/get-organization.use-case';
import { UpdateOrganizationUseCase } from '../../application/use-cases/update-organization.use-case';
import { ChangeOrganizationStatusUseCase } from '../../application/use-cases/change-organization-status.use-case';
import { DeleteOrganizationUseCase } from '../../application/use-cases/delete-organization.use-case';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly changeOrganizationStatusUseCase: ChangeOrganizationStatusUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
  ) {}

  @Post()
  @Permissions('ORGANIZATION_CREATE')
  @ApiOperation({ summary: 'Criar organização' })
  async create(@Body() dto: CreateOrganizationDto, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.createOrganizationUseCase.execute(dto, actor.userId);
    return { message: 'Organização criada', data };
  }

  @Get()
  @Permissions('ORGANIZATION_VIEW')
  @ApiOperation({ summary: 'Listar organizações' })
  async list(@Query() query: PaginationQueryDto) {
    const data = await this.listOrganizationsUseCase.execute(query);
    return { message: 'Organizações listadas', data };
  }

  @Get(':id')
  @Permissions('ORGANIZATION_VIEW')
  @ApiOperation({ summary: 'Buscar organização' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.getOrganizationUseCase.execute(id);
    return { message: 'Organização encontrada', data };
  }

  @Patch(':id')
  @Permissions('ORGANIZATION_UPDATE')
  @ApiOperation({ summary: 'Atualizar organização' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.updateOrganizationUseCase.execute(id, dto, actor.userId);
    return { message: 'Organização atualizada', data };
  }

  @Patch(':id/status')
  @Permissions('ORGANIZATION_UPDATE')
  @ApiOperation({ summary: 'Alterar status da organização' })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeOrganizationStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.changeOrganizationStatusUseCase.execute(id, dto, actor.userId);
    return { message: 'Status atualizado', data };
  }

  @Delete(':id')
  @Permissions('ORGANIZATION_DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover organização (soft delete)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.deleteOrganizationUseCase.execute(id, actor.userId);
    return { message: 'Organização removida', data: null };
  }
}
