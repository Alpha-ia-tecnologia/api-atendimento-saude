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
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UpdateUserDto } from '../../application/dtos/update-user.dto';
import { ChangeUserStatusDto } from '../../application/dtos/change-user-status.dto';
import { ChangePasswordDto } from '../../application/dtos/change-password.dto';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { ChangeUserStatusUseCase } from '../../application/use-cases/change-user-status.use-case';
import { ChangeUserPasswordUseCase } from '../../application/use-cases/change-user-password.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../shared/guards/permissions.guard';
import { Permissions } from '../../../../shared/decorators/permissions.decorator';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../shared/types/authenticated-user';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changeUserStatusUseCase: ChangeUserStatusUseCase,
    private readonly changeUserPasswordUseCase: ChangeUserPasswordUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Post()
  @Permissions('USER_CREATE')
  @ApiOperation({ summary: 'Criar usuário' })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.createUserUseCase.execute(dto, actor.userId);
    return { message: 'Usuário criado com sucesso', data };
  }

  @Get()
  @Permissions('USER_VIEW')
  @ApiOperation({ summary: 'Listar usuários' })
  async list(@Query() query: PaginationQueryDto) {
    const data = await this.listUsersUseCase.execute(query);
    return { message: 'Usuários listados', data };
  }

  @Get(':id')
  @Permissions('USER_VIEW')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.getUserUseCase.execute(id);
    return { message: 'Usuário encontrado', data };
  }

  @Patch(':id')
  @Permissions('USER_UPDATE')
  @ApiOperation({ summary: 'Atualizar usuário' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.updateUserUseCase.execute(id, dto, actor.userId);
    return { message: 'Usuário atualizado', data };
  }

  @Patch(':id/status')
  @Permissions('USER_UPDATE')
  @ApiOperation({ summary: 'Alterar status do usuário' })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.changeUserStatusUseCase.execute(id, dto, actor.userId);
    return { message: 'Status atualizado', data };
  }

  @Patch(':id/password')
  @Permissions('USER_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar senha do usuário' })
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.changeUserPasswordUseCase.execute(id, dto, actor.userId);
    return { message: 'Senha alterada', data: null };
  }

  @Delete(':id')
  @Permissions('USER_DELETE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete de usuário' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.deleteUserUseCase.execute(id, actor.userId);
    return { message: 'Usuário removido', data: null };
  }
}
