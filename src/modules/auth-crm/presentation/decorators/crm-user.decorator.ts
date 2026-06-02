import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { AuthenticatedCrm } from '../../application/services/token-crm.service';

/** Injeta o operador CRM autenticado em rotas protegidas pelo JwtCrmGuard. */
export const CrmUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCrm => {
    const req = ctx.switchToHttp().getRequest<{ crmUser?: AuthenticatedCrm }>();
    if (!req.crmUser) {
      throw new Error('CrmUser decorator usado fora de rota protegida.');
    }
    return req.crmUser;
  },
);
