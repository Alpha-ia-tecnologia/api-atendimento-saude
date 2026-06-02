import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

@Injectable()
export class LogoutCrmUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Revoga todos os refresh tokens vivos da sessão atual. */
  async execute(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }
}
