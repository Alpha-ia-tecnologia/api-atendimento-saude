import { randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { AuthCrmResponseDto } from '../dtos/auth-crm-response.dto';
import { LoginCrmDto } from '../dtos/login-crm.dto';
import { TokenCrmService } from '../services/token-crm.service';

@Injectable()
export class LoginCrmUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenCrmService,
    private readonly config: ConfigService,
  ) {}

  async execute(dto: LoginCrmDto): Promise<AuthCrmResponseDto> {
    const usuario = await this.prisma.usuarioCrm.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Erro genérico: não revela se o e-mail existe (anti-enumeração).
    const credenciaisInvalidas = new UnauthorizedException(
      'E-mail ou senha incorretos.',
    );

    if (!usuario || usuario.excluidoEm) throw credenciaisInvalidas;

    const senhaOk = await bcrypt.compare(dto.senha, usuario.senhaHash);
    if (!senhaOk) throw credenciaisInvalidas;

    if (!usuario.ativo) {
      throw new UnauthorizedException('Conta desativada. Procure o administrador.');
    }

    // Sessão única: revoga refresh tokens ativos anteriores.
    const sessaoUnica =
      this.config.get<string>('AUTH_SINGLE_SESSION', 'true') === 'true';
    if (sessaoUnica) {
      await this.prisma.refreshToken.updateMany({
        where: { usuarioCrmId: usuario.id, revogadoEm: null },
        data: { revogadoEm: new Date() },
      });
    }

    const sessionId = randomUUID();
    const accessToken = await this.tokenService.signAccessToken({
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.tipoPerfil,
      sessionId,
    });
    const refreshToken = await this.tokenService.signRefreshToken({
      sub: usuario.id,
      sessionId,
    });

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          usuarioCrmId: usuario.id,
          tokenHash,
          sessionId,
          expiraEm: new Date(Date.now() + this.tokenService.refreshTtlMs()),
        },
      }),
      this.prisma.usuarioCrm.update({
        where: { id: usuario.id },
        data: { ultimoLoginEm: new Date() },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nomeCompleto: usuario.nomeCompleto,
        email: usuario.email,
        perfil: usuario.tipoPerfil,
      },
    };
  }
}
