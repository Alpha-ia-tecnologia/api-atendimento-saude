import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthCrmResponseDto, UsuarioCrmDto } from '../../application/dtos/auth-crm-response.dto';
import { LoginCrmDto } from '../../application/dtos/login-crm.dto';
import { RefreshCrmDto } from '../../application/dtos/refresh-crm.dto';
import type { AuthenticatedCrm } from '../../application/services/token-crm.service';
import { ListarOperadoresCrmUseCase } from '../../application/use-cases/listar-operadores-crm.use-case';
import { LoginCrmUseCase } from '../../application/use-cases/login-crm.use-case';
import { LogoutCrmUseCase } from '../../application/use-cases/logout-crm.use-case';
import { ObterPerfilCrmUseCase } from '../../application/use-cases/obter-perfil-crm.use-case';
import { RefreshCrmUseCase } from '../../application/use-cases/refresh-crm.use-case';
import { CrmUser } from '../decorators/crm-user.decorator';
import { JwtCrmGuard } from '../guards/jwt-crm.guard';

@ApiTags('Auth CRM (operador)')
@Controller('auth')
export class AuthCrmController {
  constructor(
    private readonly loginUseCase: LoginCrmUseCase,
    private readonly refreshUseCase: RefreshCrmUseCase,
    private readonly logoutUseCase: LogoutCrmUseCase,
    private readonly obterPerfilUseCase: ObterPerfilCrmUseCase,
    private readonly listarOperadoresUseCase: ListarOperadoresCrmUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login do operador (e-mail + senha).' })
  @ApiOkResponse({ type: AuthCrmResponseDto })
  async login(@Body() dto: LoginCrmDto): Promise<AuthCrmResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renova o par de tokens (rotação do refresh).' })
  @ApiOkResponse({ type: AuthCrmResponseDto })
  async refresh(@Body() dto: RefreshCrmDto): Promise<AuthCrmResponseDto> {
    return this.refreshUseCase.execute(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtCrmGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerra a sessão atual (revoga os tokens).' })
  async logout(@CrmUser() user: AuthenticatedCrm): Promise<void> {
    await this.logoutUseCase.execute(user.sessionId);
  }

  @Get('me')
  @UseGuards(JwtCrmGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do operador autenticado.' })
  @ApiOkResponse({ type: UsuarioCrmDto })
  async me(@CrmUser() user: AuthenticatedCrm): Promise<UsuarioCrmDto> {
    return this.obterPerfilUseCase.execute(user.usuarioCrmId);
  }

  @Get('operadores')
  @UseGuards(JwtCrmGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista operadores ativos do CRM (id + nome), para filtros.',
  })
  async listarOperadores() {
    return this.listarOperadoresUseCase.execute();
  }
}
