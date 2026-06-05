import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

/**
 * Remove o Expo Push Token do aparelho (chamado no logout do app, pra parar
 * de receber push de uma conta que saiu). Idempotente: remover token que não
 * existe (ou de outro dono) não é erro.
 */
@Injectable()
export class RemoverDeviceTokenUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioMariaId: string, token: string): Promise<{ removido: boolean }> {
    const { count } = await this.prisma.deviceToken.deleteMany({
      where: { token, usuarioMariaId },
    });
    return { removido: count > 0 };
  }
}
