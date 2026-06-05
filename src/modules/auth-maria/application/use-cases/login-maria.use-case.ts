import { Injectable, UnauthorizedException } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { mapearUsuarioMaria } from '../mappers/usuario-maria.mapper';
import { LoginCadastradoResponseDto, LoginNovoResponseDto } from '../dtos/auth-maria-response.dto';
import { LoginMariaDto } from '../dtos/login-maria.dto';
import { TokenMariaService } from '../services/token-maria.service';
import { parseDataNascimentoBR, somenteDigitos } from '../utils/formatters';

@Injectable()
export class LoginMariaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenMariaService,
    private readonly minio: MinioService,
  ) {}

  async execute(dto: LoginMariaDto): Promise<LoginCadastradoResponseDto | LoginNovoResponseDto> {
    const cpfLimpo = somenteDigitos(dto.cpf);
    const dataNasc = parseDataNascimentoBR(dto.dataNascimento);

    const usuario = await this.prisma.usuarioMaria.findUnique({
      where: { cpf: cpfLimpo },
    });

    // Não existe → manda pro fluxo de cadastro, devolvendo os dados já
    // validados pra o cliente reaproveitar no próximo passo.
    if (!usuario) {
      return {
        status: 'NOVO',
        cpf: cpfLimpo,
        dataNascimento: dto.dataNascimento,
      };
    }

    // Existe mas data não bate → trata como credencial inválida sem revelar
    // se o CPF existe (proteção contra enumeração).
    const dataBate =
      usuario.dataNascimento.getUTCFullYear() === dataNasc.getUTCFullYear() &&
      usuario.dataNascimento.getUTCMonth() === dataNasc.getUTCMonth() &&
      usuario.dataNascimento.getUTCDate() === dataNasc.getUTCDate();

    if (!dataBate) {
      throw new UnauthorizedException('CPF ou data de nascimento incorretos.');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException('Conta inativa. Procure a CEMARC.');
    }

    const accessToken = await this.tokenService.signAccessToken({
      sub: usuario.id,
      cpf: usuario.cpf,
    });

    return {
      status: 'CADASTRADO',
      accessToken,
      usuario: await mapearUsuarioMaria(usuario, this.minio),
    };
  }
}
