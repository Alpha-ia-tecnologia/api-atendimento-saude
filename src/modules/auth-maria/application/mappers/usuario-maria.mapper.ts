import { UsuarioMaria } from '@prisma/client';

import { MinioService } from '../../../files/application/services/minio.service';
import { UsuarioMariaDto } from '../dtos/auth-maria-response.dto';
import { formatarDataNascimentoISO } from '../utils/formatters';

/**
 * Converte UsuarioMaria do Prisma pro DTO da resposta.
 * Assina a fotoPerfilUrl via MinIO presigner (funciona em bucket privado).
 */
export async function mapearUsuarioMaria(
  u: UsuarioMaria,
  minio: MinioService,
): Promise<UsuarioMariaDto> {
  return {
    id: u.id,
    nome: u.nome,
    cpf: u.cpf,
    dataNascimento: formatarDataNascimentoISO(u.dataNascimento),
    numeroWhatsapp: u.numeroWhatsapp,
    endereco: u.endereco,
    fotoPerfilUrl: await minio.assinarUrlDeArquivo(u.fotoPerfilUrl),
    criadoEm: u.criadoEm,
  };
}
