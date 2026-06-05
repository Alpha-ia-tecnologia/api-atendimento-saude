import { ConflictException, Injectable } from '@nestjs/common';
import { TipoPerfilMaria } from '@prisma/client';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { mapearUsuarioMaria } from '../mappers/usuario-maria.mapper';
import { RegistroResponseDto } from '../dtos/auth-maria-response.dto';
import { RegistroMariaDto } from '../dtos/registro-maria.dto';
import { TokenMariaService } from '../services/token-maria.service';
import { parseDataNascimentoBR, somenteDigitos } from '../utils/formatters';

@Injectable()
export class RegistroMariaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenMariaService,
    private readonly minio: MinioService,
  ) {}

  async execute(dto: RegistroMariaDto): Promise<RegistroResponseDto> {
    const cpfLimpo = somenteDigitos(dto.cpf);
    const telefoneLimpo = somenteDigitos(dto.telefone);
    const dataNasc = parseDataNascimentoBR(dto.dataNascimento);

    const jaExiste = await this.prisma.usuarioMaria.findUnique({
      where: { cpf: cpfLimpo },
      select: { id: true },
    });
    if (jaExiste) {
      throw new ConflictException('Este CPF já está cadastrado. Volte à tela de login.');
    }

    const usuario = await this.prisma.usuarioMaria.create({
      data: {
        nome: dto.nome.trim(),
        cpf: cpfLimpo,
        dataNascimento: dataNasc,
        numeroWhatsapp: telefoneLimpo,
        endereco: dto.endereco.trim(),
        fotoPerfilUrl: dto.fotoPerfilUrl ?? null,
        tipoPerfil: TipoPerfilMaria.SOLICITANTE,
        ativo: true,
        preferenciasAcessibilidade: {
          create: {
            altoContraste: false,
            escalaFonte: 1.0,
            narracao: false,
          },
        },
      },
    });

    const accessToken = await this.tokenService.signAccessToken({
      sub: usuario.id,
      cpf: usuario.cpf,
    });

    return {
      accessToken,
      usuario: await mapearUsuarioMaria(usuario, this.minio),
    };
  }
}
