import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

@Injectable()
export class ExcluirEspecialidadeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<{ ok: true }> {
    const existe = await this.prisma.especialidade.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Especialidade não encontrada.');

    const vinculadas = await this.prisma.solicitacao.count({
      where: { especialidadeId: id },
    });
    if (vinculadas > 0) {
      throw new BadRequestException(
        'Esta especialidade tem solicitações vinculadas. Desative-a (indisponível) em vez de excluir.',
      );
    }

    await this.prisma.especialidade.delete({ where: { id } });
    return { ok: true };
  }
}
