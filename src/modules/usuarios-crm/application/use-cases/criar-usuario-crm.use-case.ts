import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { hashPassword } from '../../../../shared/utils/bcrypt.util';
import { CriarUsuarioCrmDto } from '../dtos/criar-usuario-crm.dto';
import { UsuarioCrmAdminDto } from '../dtos/usuario-crm-admin.dto';
import { toUsuarioCrmAdminDto, usuarioCrmAdminSelect } from '../mappers/usuario-crm.mapper';

@Injectable()
export class CriarUsuarioCrmUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async execute(dto: CriarUsuarioCrmDto): Promise<UsuarioCrmAdminDto> {
    const email = dto.email.toLowerCase().trim();

    const existente = await this.prisma.usuarioCrm.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException('Já existe um operador com este e-mail.');
    }

    const saltRounds = Number(this.config.get<string>('BCRYPT_SALT_ROUNDS', '10'));
    const senhaHash = await hashPassword(dto.senha, saltRounds);

    const criado = await this.prisma.usuarioCrm.create({
      data: {
        nomeCompleto: dto.nomeCompleto.trim(),
        email,
        senhaHash,
        tipoPerfil: dto.tipoPerfil,
        ativo: true,
      },
      select: usuarioCrmAdminSelect,
    });

    return toUsuarioCrmAdminDto(criado);
  }
}
