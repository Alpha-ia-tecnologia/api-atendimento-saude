import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { LoginDto } from '../../application/dtos/login.dto';
import { RefreshTokenDto } from '../../application/dtos/refresh-token.dto';
import { AuthResponseDto, AuthUserDto } from '../../application/dtos/auth-response.dto';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { Public } from '../../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../../shared/types/authenticated-user';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const data = await this.loginUseCase.execute(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: 'Login realizado com sucesso', data };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token via refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.refreshTokenUseCase.execute(dto);
    return { message: 'Token renovado', data };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar sessão atual' })
  async logout(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    await this.logoutUseCase.execute({
      userId: user.userId,
      sessionId: user.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: 'Logout realizado com sucesso', data: null };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiOkResponse({ type: AuthUserDto })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.getCurrentUserUseCase.execute(user.userId);
    return { message: 'Usuário autenticado', data };
  }
}
