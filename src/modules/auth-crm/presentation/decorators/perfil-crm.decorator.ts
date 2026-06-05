import { SetMetadata } from '@nestjs/common';
import { TipoPerfilCrm } from '@prisma/client';

export const PERFIL_CRM_KEY = 'perfilCrm';

/**
 * Restringe a rota aos perfis informados. Sem o decorator, basta estar
 * autenticado (JwtCrmGuard). Ex.: `@PerfilCrm('ADMIN', 'SUPERVISOR')`.
 */
export const PerfilCrm = (...perfis: TipoPerfilCrm[]) => SetMetadata(PERFIL_CRM_KEY, perfis);
