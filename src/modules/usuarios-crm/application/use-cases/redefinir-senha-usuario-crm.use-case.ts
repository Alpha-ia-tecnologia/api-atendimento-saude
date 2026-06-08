import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { hashPassword } from '../../../../shared/utils/bcrypt.util';

@Injectable()
export class RedefinirSenhaUsuarioCrmUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async execute(id: string, senha: string): Promise<void> {
    const usuario = await this.prisma.usuarioCrm.findFirst({
      where: { id, excluidoEm: null },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Operador não encontrado.');

    const saltRounds = Number(this.config.get<string>('BCRYPT_SALT_ROUNDS', '10'));
    const senhaHash = await hashPassword(senha, saltRounds);

    await this.prisma.usuarioCrm.update({
      where: { id },
      data: { senhaHash },
    });

    // Força novo login: revoga as sessões ativas do operador.
    await this.prisma.refreshToken.updateMany({
      where: { usuarioCrmId: id, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }
}
