import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../shared/guards/permissions.guard';
import { Permissions } from '../../../../shared/decorators/permissions.decorator';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../shared/types/authenticated-user';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';
import { CreatePermissionDto } from '../../application/dtos/create-permission.dto';
import { CreatePermissionUseCase } from '../../application/use-cases/create-permission.use-case';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case';
import { GetPermissionUseCase } from '../../application/use-cases/get-permission.use-case';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly createPermissionUseCase: CreatePermissionUseCase,
    private readonly listPermissionsUseCase: ListPermissionsUseCase,
    private readonly getPermissionUseCase: GetPermissionUseCase,
  ) {}

  @Post()
  @Permissions('PERMISSION_CREATE')
  @ApiOperation({ summary: 'Criar permissão' })
  async create(@Body() dto: CreatePermissionDto, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.createPermissionUseCase.execute(dto, actor.userId);
    return { message: 'Permissão criada', data };
  }

  @Get()
  @Permissions('PERMISSION_VIEW')
  @ApiOperation({ summary: 'Listar permissões' })
  async list(@Query() query: PaginationQueryDto) {
    const data = await this.listPermissionsUseCase.execute(query);
    return { message: 'Permissões listadas', data };
  }

  @Get(':id')
  @Permissions('PERMISSION_VIEW')
  @ApiOperation({ summary: 'Buscar permissão' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.getPermissionUseCase.execute(id);
    return { message: 'Permissão encontrada', data };
  }
}
