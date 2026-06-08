import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoPerfilCrm } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { AtualizarUsuarioCrmDto } from '../dtos/atualizar-usuario-crm.dto';
import { UsuarioCrmAdminDto } from '../dtos/usuario-crm-admin.dto';
import { toUsuarioCrmAdminDto, usuarioCrmAdminSelect } from '../mappers/usuario-crm.mapper';

@Injectable()
export class AtualizarUsuarioCrmUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    id: string,
    dto: AtualizarUsuarioCrmDto,
    atorId: string,
  ): Promise<UsuarioCrmAdminDto> {
    const usuario = await this.prisma.usuarioCrm.findFirst({
      where: { id, excluidoEm: null },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Operador não encontrado.');

    // Trava anti-lockout: o admin não pode rebaixar o próprio perfil.
    if (id === atorId && dto.tipoPerfil !== undefined && dto.tipoPerfil !== TipoPerfilCrm.ADMIN) {
      throw new ForbiddenException('Você não pode rebaixar o seu próprio perfil.');
    }

    const atualizado = await this.prisma.usuarioCrm.update({
      where: { id },
      data: {
        ...(dto.nomeCompleto !== undefined ? { nomeCompleto: dto.nomeCompleto.trim() } : {}),
        ...(dto.tipoPerfil !== undefined ? { tipoPerfil: dto.tipoPerfil } : {}),
      },
      select: usuarioCrmAdminSelect,
    });

    return toUsuarioCrmAdminDto(atualizado);
  }
}
