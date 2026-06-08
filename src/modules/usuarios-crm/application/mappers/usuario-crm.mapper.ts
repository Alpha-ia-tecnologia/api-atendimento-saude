import { UsuarioCrm } from '@prisma/client';

import { UsuarioCrmAdminDto } from '../dtos/usuario-crm-admin.dto';

/** Subconjunto seguro do registro (o que `usuarioCrmAdminSelect` traz). */
export type UsuarioCrmAdminRow = Pick<
  UsuarioCrm,
  'id' | 'nomeCompleto' | 'email' | 'tipoPerfil' | 'ativo' | 'ultimoLoginEm' | 'criadoEm'
>;

/** Converte o registro do banco no DTO público (sem expor `senhaHash`). */
export function toUsuarioCrmAdminDto(u: UsuarioCrmAdminRow): UsuarioCrmAdminDto {
  return {
    id: u.id,
    nomeCompleto: u.nomeCompleto,
    email: u.email,
    tipoPerfil: u.tipoPerfil,
    ativo: u.ativo,
    ultimoLoginEm: u.ultimoLoginEm ? u.ultimoLoginEm.toISOString() : null,
    criadoEm: u.criadoEm.toISOString(),
  };
}

/** Campos seguros para `select` do Prisma (nunca traz `senhaHash`). */
export const usuarioCrmAdminSelect = {
  id: true,
  nomeCompleto: true,
  email: true,
  tipoPerfil: true,
  ativo: true,
  ultimoLoginEm: true,
  criadoEm: true,
} as const;
