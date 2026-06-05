import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

/**
 * Registra (ou reativa) o Expo Push Token de um aparelho do solicitante.
 * Upsert pelo token: o mesmo aparelho pode trocar de dono (logout/login),
 * então a reatribuição de usuário é esperada e silenciosa.
 */
@Injectable()
export class RegistrarDeviceTokenUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    usuarioMariaId: string,
    token: string,
    plataforma: string,
  ): Promise<{ registrado: true }> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { usuarioMariaId, token, plataforma, ativo: true },
      update: { usuarioMariaId, plataforma, ativo: true },
    });
    return { registrado: true };
  }
}
