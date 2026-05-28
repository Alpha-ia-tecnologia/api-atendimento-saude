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
import { CreateRoleDto } from '../../application/dtos/create-role.dto';
import { UpdateRoleDto } from '../../application/dtos/update-role.dto';
import { AssignPermissionsToRoleDto } from '../../application/dtos/assign-permissions-to-role.dto';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { GetRoleUseCase } from '../../application/use-cases/get-role.use-case';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case';
import { AssignPermissionsToRoleUseCase } from '../../application/use-cases/assign-permissions-to-role.use-case';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly assignPermissionsToRoleUseCase: AssignPermissionsToRoleUseCase,
  ) {}

  @Post()
  @Permissions('ROLE_CREATE')
  @ApiOperation({ summary: 'Criar papel' })
  async create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.createRoleUseCase.execute(dto, actor.userId);
    return { message: 'Papel criado', data };
  }

  @Get()
  @Permissions('ROLE_VIEW')
  @ApiOperation({ summary: 'Listar papéis' })
  async list(@Query() query: PaginationQueryDto) {
    const data = await this.listRolesUseCase.execute(query);
    return { message: 'Papéis listados', data };
  }

  @Get(':id')
  @Permissions('ROLE_VIEW')
  @ApiOperation({ summary: 'Buscar papel' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.getRoleUseCase.execute(id);
    return { message: 'Papel encontrado', data };
  }

  @Patch(':id')
  @Permissions('ROLE_UPDATE')
  @ApiOperation({ summary: 'Atualizar papel' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.updateRoleUseCase.execute(id, dto, actor.userId);
    return { message: 'Papel atualizado', data };
  }

  @Delete(':id')
  @Permissions('ROLE_DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover papel (soft delete)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.deleteRoleUseCase.execute(id, actor.userId);
    return { message: 'Papel removido', data: null };
  }

  @Post(':id/permissions')
  @Permissions('ROLE_UPDATE')
  @ApiOperation({ summary: 'Atribuir permissões ao papel' })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsToRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.assignPermissionsToRoleUseCase.execute(id, dto, actor.userId);
    return { message: 'Permissões atribuídas', data };
  }
}
