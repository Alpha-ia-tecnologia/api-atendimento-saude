import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  LoginCadastradoResponseDto,
  LoginNovoResponseDto,
} from '../dtos/auth-maria-response.dto';
import { LoginMariaDto } from '../dtos/login-maria.dto';
import { TokenMariaService } from '../services/token-maria.service';
import {
  formatarDataNascimentoISO,
  parseDataNascimentoBR,
  somenteDigitos,
} from '../utils/formatters';

@Injectable()
export class LoginMariaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenMariaService,
  ) {}

  async execute(
    dto: LoginMariaDto,
  ): Promise<LoginCadastradoResponseDto | LoginNovoResponseDto> {
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
      throw new UnauthorizedException(
        'CPF ou data de nascimento incorretos.',
      );
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
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        cpf: usuario.cpf,
        dataNascimento: formatarDataNascimentoISO(usuario.dataNascimento),
        numeroWhatsapp: usuario.numeroWhatsapp,
        endereco: usuario.endereco,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
        criadoEm: usuario.criadoEm,
      },
    };
  }
}
