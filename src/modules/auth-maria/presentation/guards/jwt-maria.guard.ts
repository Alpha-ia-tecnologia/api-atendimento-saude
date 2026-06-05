import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import {
  AuthenticatedMaria,
  TokenMariaService,
} from '../../application/services/token-maria.service';

@Injectable()
export class JwtMariaGuard implements CanActivate {
  constructor(private readonly tokenService: TokenMariaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { mariaUser?: AuthenticatedMaria }>();

    const header = req.headers.authorization;
    if (!header) throw new UnauthorizedException('Token não informado.');

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de token inválido.');
    }

    const payload = await this.tokenService.verifyAccessToken(token);
    req.mariaUser = { usuarioMariaId: payload.sub, cpf: payload.cpf };
    return true;
  }
}
