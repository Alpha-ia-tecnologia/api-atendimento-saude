import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TipoPerfilCrm } from '@prisma/client';

import { AuthenticatedCrm } from '../../application/services/token-crm.service';
import { PERFIL_CRM_KEY } from '../decorators/perfil-crm.decorator';

/**
 * Autorização por perfil. Roda DEPOIS do JwtCrmGuard (que popula req.crmUser).
 * Sem `@PerfilCrm(...)` no handler, libera qualquer operador autenticado.
 */
@Injectable()
export class PerfilGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfis = this.reflector.getAllAndOverride<TipoPerfilCrm[] | undefined>(PERFIL_CRM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!perfis || perfis.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { crmUser?: AuthenticatedCrm }>();
    const perfil = req.crmUser?.perfil;
    if (!perfil || !perfis.includes(perfil)) {
      throw new ForbiddenException('Seu perfil não tem acesso a esta ação.');
    }
    return true;
  }
}
