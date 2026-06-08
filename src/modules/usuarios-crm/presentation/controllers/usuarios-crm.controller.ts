import {
  Body,
  Controller,
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
import { TipoPerfilCrm } from '@prisma/client';

import type { AuthenticatedCrm } from '../../../auth-crm/application/services/token-crm.service';
import { CrmUser } from '../../../auth-crm/presentation/decorators/crm-user.decorator';
import { PerfilCrm } from '../../../auth-crm/presentation/decorators/perfil-crm.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import { AlterarStatusUsuarioCrmDto } from '../../application/dtos/alterar-status-usuario-crm.dto';
import { AtualizarUsuarioCrmDto } from '../../application/dtos/atualizar-usuario-crm.dto';
import { CriarUsuarioCrmDto } from '../../application/dtos/criar-usuario-crm.dto';
import { ListarUsuariosCrmQueryDto } from '../../application/dtos/listar-usuarios-crm.dto';
import { RedefinirSenhaCrmDto } from '../../application/dtos/redefinir-senha-crm.dto';
import { AlterarStatusUsuarioCrmUseCase } from '../../application/use-cases/alterar-status-usuario-crm.use-case';
import { AtualizarUsuarioCrmUseCase } from '../../application/use-cases/atualizar-usuario-crm.use-case';
import { CriarUsuarioCrmUseCase } from '../../application/use-cases/criar-usuario-crm.use-case';
import { ListarUsuariosCrmUseCase } from '../../application/use-cases/listar-usuarios-crm.use-case';
import { RedefinirSenhaUsuarioCrmUseCase } from '../../application/use-cases/redefinir-senha-usuario-crm.use-case';

@ApiTags('Usuários CRM (admin)')
@ApiBearerAuth()
@UseGuards(JwtCrmGuard, PerfilGuard)
@PerfilCrm(TipoPerfilCrm.ADMIN)
@Controller('usuarios-crm')
export class UsuariosCrmController {
  constructor(
    private readonly criarUseCase: CriarUsuarioCrmUseCase,
    private readonly listarUseCase: ListarUsuariosCrmUseCase,
    private readonly atualizarUseCase: AtualizarUsuarioCrmUseCase,
    private readonly alterarStatusUseCase: AlterarStatusUsuarioCrmUseCase,
    private readonly redefinirSenhaUseCase: RedefinirSenhaUsuarioCrmUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo operador do CRM.' })
  async criar(@Body() dto: CriarUsuarioCrmDto) {
    return this.criarUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista operadores do CRM (busca, paginação e filtros).' })
  async listar(@Query() query: ListarUsuariosCrmQueryDto) {
    return this.listarUseCase.execute(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza nome e/ou perfil de um operador.' })
  async atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarUsuarioCrmDto,
    @CrmUser() ator: AuthenticatedCrm,
  ) {
    return this.atualizarUseCase.execute(id, dto, ator.usuarioCrmId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativa ou desativa um operador.' })
  async alterarStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlterarStatusUsuarioCrmDto,
    @CrmUser() ator: AuthenticatedCrm,
  ) {
    return this.alterarStatusUseCase.execute(id, dto.ativo, ator.usuarioCrmId);
  }

  @Patch(':id/senha')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Redefine a senha de um operador.' })
  async redefinirSenha(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RedefinirSenhaCrmDto,
  ): Promise<void> {
    await this.redefinirSenhaUseCase.execute(id, dto.senha);
  }
}
