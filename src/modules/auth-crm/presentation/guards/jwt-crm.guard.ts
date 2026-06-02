import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  AuthenticatedCrm,
  TokenCrmService,
} from '../../application/services/token-crm.service';

@Injectable()
export class JwtCrmGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenCrmService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { crmUser?: AuthenticatedCrm }>();

    const header = req.headers.authorization;
    if (!header) throw new UnauthorizedException('Token não informado.');

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de token inválido.');
    }

    const payload = await this.tokenService.verifyAccessToken(token);

    // Sessão única / logout: o access é stateless, mas validamos que a sessão
    // ainda tem um refresh token vivo (não revogado).
    const sessaoViva = await this.prisma.refreshToken.findFirst({
      where: { sessionId: payload.sessionId, revogadoEm: null },
      select: { id: true },
    });
    if (!sessaoViva) {
      throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
    }

    req.crmUser = {
      usuarioCrmId: payload.sub,
      email: payload.email,
      perfil: payload.perfil,
      sessionId: payload.sessionId,
    };
    return true;
  }
}
