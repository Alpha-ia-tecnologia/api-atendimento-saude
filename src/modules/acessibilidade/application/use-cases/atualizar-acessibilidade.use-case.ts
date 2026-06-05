import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { AcessibilidadeResponseDto } from '../dtos/acessibilidade-response.dto';
import { AtualizarAcessibilidadeDto } from '../dtos/atualizar-acessibilidade.dto';
import { indexParaMultiplicador, multiplicadorParaIndex } from '../utils/escala-fonte';

/**
 * PATCH parcial — só atualiza o que veio no body. Faz upsert pra criar
 * o registro caso ainda não exista (usuário antigo, race, etc).
 */
@Injectable()
export class AtualizarAcessibilidadeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    usuarioMariaId: string,
    dto: AtualizarAcessibilidadeDto,
  ): Promise<AcessibilidadeResponseDto> {
    const escalaMult =
      dto.escalaFonte !== undefined ? indexParaMultiplicador(dto.escalaFonte) : undefined;

    const atualizado = await this.prisma.preferenciasAcessibilidade.upsert({
      where: { usuarioMariaId },
      create: {
        usuarioMariaId,
        escalaFonte: escalaMult ?? 1.0,
        altoContraste: dto.altoContraste ?? false,
        narracao: dto.narracao ?? false,
      },
      update: {
        ...(escalaMult !== undefined && { escalaFonte: escalaMult }),
        ...(dto.altoContraste !== undefined && { altoContraste: dto.altoContraste }),
        ...(dto.narracao !== undefined && { narracao: dto.narracao }),
      },
    });

    return {
      escalaFonte: multiplicadorParaIndex(atualizado.escalaFonte),
      altoContraste: atualizado.altoContraste,
      narracao: atualizado.narracao,
    };
  }
}
