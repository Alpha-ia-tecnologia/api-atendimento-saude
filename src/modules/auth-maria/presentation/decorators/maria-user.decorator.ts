import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { AuthenticatedMaria } from '../../application/services/token-maria.service';

/** Injeta o usuário Maria autenticado em rotas protegidas. */
export const MariaUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedMaria => {
    const req = ctx.switchToHttp().getRequest<{ mariaUser?: AuthenticatedMaria }>();
    if (!req.mariaUser) {
      throw new Error('MariaUser decorator usado fora de rota protegida.');
    }
    return req.mariaUser;
  },
);
