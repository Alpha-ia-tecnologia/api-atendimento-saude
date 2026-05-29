import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { AcessibilidadeResponseDto } from '../dtos/acessibilidade-response.dto';
import { multiplicadorParaIndex } from '../utils/escala-fonte';

/**
 * Devolve as preferências do usuário. Se o registro não existir
 * (usuário antigo, race condition), retorna defaults sem persistir.
 */
@Injectable()
export class ObterAcessibilidadeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioMariaId: string): Promise<AcessibilidadeResponseDto> {
    const prefs = await this.prisma.preferenciasAcessibilidade.findUnique({
      where: { usuarioMariaId },
    });

    if (!prefs) {
      return { escalaFonte: 0, altoContraste: false, narracao: false };
    }

    return {
      escalaFonte: multiplicadorParaIndex(prefs.escalaFonte),
      altoContraste: prefs.altoContraste,
      narracao: prefs.narracao,
    };
  }
}
