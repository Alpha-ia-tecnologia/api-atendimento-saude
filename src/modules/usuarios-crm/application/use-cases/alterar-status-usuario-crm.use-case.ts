import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { UsuarioCrmAdminDto } from '../dtos/usuario-crm-admin.dto';
import { toUsuarioCrmAdminDto, usuarioCrmAdminSelect } from '../mappers/usuario-crm.mapper';

@Injectable()
export class AlterarStatusUsuarioCrmUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, ativo: boolean, atorId: string): Promise<UsuarioCrmAdminDto> {
    const usuario = await this.prisma.usuarioCrm.findFirst({
      where: { id, excluidoEm: null },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Operador não encontrado.');

    // Trava anti-lockout: o admin não pode desativar a própria conta.
    if (id === atorId && !ativo) {
      throw new ForbiddenException('Você não pode desativar a sua própria conta.');
    }

    const atualizado = await this.prisma.usuarioCrm.update({
      where: { id },
      data: { ativo },
      select: usuarioCrmAdminSelect,
    });

    // Ao desativar, derruba as sessões ativas revogando os refresh tokens.
    if (!ativo) {
      await this.prisma.refreshToken.updateMany({
        where: { usuarioCrmId: id, revogadoEm: null },
        data: { revogadoEm: new Date() },
      });
    }

    return toUsuarioCrmAdminDto(atualizado);
  }
}
