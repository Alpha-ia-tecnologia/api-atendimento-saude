import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import {
  LoginCadastradoResponseDto,
  LoginNovoResponseDto,
  RegistroResponseDto,
  UsuarioMariaDto,
} from '../../application/dtos/auth-maria-response.dto';
import { LoginMariaDto } from '../../application/dtos/login-maria.dto';
import { RegistroMariaDto } from '../../application/dtos/registro-maria.dto';
import { LoginMariaUseCase } from '../../application/use-cases/login-maria.use-case';
import { RegistroMariaUseCase } from '../../application/use-cases/registro-maria.use-case';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { AuthenticatedMaria } from '../../application/services/token-maria.service';
import { MariaUser } from '../decorators/maria-user.decorator';
import { JwtMariaGuard } from '../guards/jwt-maria.guard';
import {
  formatarDataNascimentoISO,
} from '../../application/utils/formatters';

@ApiTags('Auth Maria (paciente)')
@Controller('auth/maria')
export class AuthMariaController {
  constructor(
    private readonly loginUseCase: LoginMariaUseCase,
    private readonly registroUseCase: RegistroMariaUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Login do paciente (CPF + data de nascimento).',
    description:
      'Se o CPF estiver cadastrado e a data bater, retorna accessToken + usuário. ' +
      'Se o CPF não existir, retorna status=NOVO pra o front seguir pro chat de cadastro.',
  })
  @ApiOkResponse({
    description: 'CADASTRADO ou NOVO',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/LoginCadastradoResponseDto' },
        { $ref: '#/components/schemas/LoginNovoResponseDto' },
      ],
    },
  })
  async login(
    @Body() dto: LoginMariaDto,
  ): Promise<LoginCadastradoResponseDto | LoginNovoResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Cadastro do paciente após o chat da Maria.',
    description:
      'Recebe os dados coletados no chat (nome, telefone, endereço) somados ao ' +
      'CPF e data de nascimento validados no login. Cria UsuarioMaria + ' +
      'PreferenciasAcessibilidade e retorna accessToken pronto pra entrar no app.',
  })
  @ApiOkResponse({ type: RegistroResponseDto })
  async registro(@Body() dto: RegistroMariaDto): Promise<RegistroResponseDto> {
    return this.registroUseCase.execute(dto);
  }

  @Get('me')
  @UseGuards(JwtMariaGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do paciente autenticado.' })
  @ApiOkResponse({ type: UsuarioMariaDto })
  async me(@MariaUser() user: AuthenticatedMaria): Promise<UsuarioMariaDto> {
    const usuario = await this.prisma.usuarioMaria.findUniqueOrThrow({
      where: { id: user.usuarioMariaId },
    });
    return {
      id: usuario.id,
      nome: usuario.nome,
      cpf: usuario.cpf,
      dataNascimento: formatarDataNascimentoISO(usuario.dataNascimento),
      numeroWhatsapp: usuario.numeroWhatsapp,
      endereco: usuario.endereco,
      fotoPerfilUrl: usuario.fotoPerfilUrl,
      criadoEm: usuario.criadoEm,
    };
  }
}
