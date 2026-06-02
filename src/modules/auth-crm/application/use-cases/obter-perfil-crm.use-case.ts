import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { UsuarioCrmDto } from '../dtos/auth-crm-response.dto';

@Injectable()
export class ObterPerfilCrmUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioCrmId: string): Promise<UsuarioCrmDto> {
    const usuario = await this.prisma.usuarioCrm.findUnique({
      where: { id: usuarioCrmId },
    });
    if (!usuario || !usuario.ativo || usuario.excluidoEm) {
      throw new UnauthorizedException('Operador não encontrado ou inativo.');
    }
    return {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      perfil: usuario.tipoPerfil,
    };
  }
}
