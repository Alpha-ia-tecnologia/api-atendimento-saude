import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { AuthCrmResponseDto } from '../dtos/auth-crm-response.dto';
import { RefreshCrmDto } from '../dtos/refresh-crm.dto';
import { TokenCrmService } from '../services/token-crm.service';

@Injectable()
export class RefreshCrmUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenCrmService,
  ) {}

  async execute(dto: RefreshCrmDto): Promise<AuthCrmResponseDto> {
    const sessaoInvalida = new UnauthorizedException('Sessão expirada. Faça login novamente.');

    const payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);

    // Token vivo (não revogado, não expirado) para esta sessão.
    const registro = await this.prisma.refreshToken.findFirst({
      where: {
        sessionId: payload.sessionId,
        usuarioCrmId: payload.sub,
        revogadoEm: null,
        expiraEm: { gt: new Date() },
      },
    });
    if (!registro) throw sessaoInvalida;

    const confere = this.tokenService.compareRefreshToken(dto.refreshToken, registro.tokenHash);
    if (!confere) throw sessaoInvalida;

    const usuario = await this.prisma.usuarioCrm.findUnique({
      where: { id: payload.sub },
    });
    if (!usuario || !usuario.ativo || usuario.excluidoEm) throw sessaoInvalida;

    // Rotação: emite novo par mantendo o sessionId; revoga o registro antigo.
    const accessToken = await this.tokenService.signAccessToken({
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.tipoPerfil,
      sessionId: payload.sessionId,
    });
    const refreshToken = await this.tokenService.signRefreshToken({
      sub: usuario.id,
      sessionId: payload.sessionId,
    });

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: registro.id },
        data: { revogadoEm: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          usuarioCrmId: usuario.id,
          tokenHash,
          sessionId: payload.sessionId,
          expiraEm: new Date(Date.now() + this.tokenService.refreshTtlMs()),
        },
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
