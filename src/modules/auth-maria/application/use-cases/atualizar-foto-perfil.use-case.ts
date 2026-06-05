import { Injectable, NotFoundException } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { UsuarioMariaDto } from '../dtos/auth-maria-response.dto';
import { mapearUsuarioMaria } from '../mappers/usuario-maria.mapper';

/**
 * Atualiza apenas a foto de perfil do paciente.
 * Recebe a URL retornada pelo POST /uploads/perfil (URL pública do MinIO).
 *
 * Passar `null` apaga a foto (remoção).
 */
@Injectable()
export class AtualizarFotoPerfilUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async execute(usuarioMariaId: string, fotoPerfilUrl: string | null): Promise<UsuarioMariaDto> {
    const existe = await this.prisma.usuarioMaria.findUnique({
      where: { id: usuarioMariaId },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const atualizado = await this.prisma.usuarioMaria.update({
      where: { id: usuarioMariaId },
      data: { fotoPerfilUrl },
    });

    return mapearUsuarioMaria(atualizado, this.minio);
  }
}
