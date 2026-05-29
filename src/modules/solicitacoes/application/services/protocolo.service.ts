import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

/**
 * Gera protocolos no formato AAAAXXXXXX (ano + 6 dígitos aleatórios).
 * Espelha o formato que o front já usa nos mocks.
 *
 * Colisão é estatisticamente improvável (1 em 900.000 por ano), mas
 * fazemos retry em caso de race condition no @unique do schema.
 */
@Injectable()
export class ProtocoloService {
  constructor(private readonly prisma: PrismaService) {}

  async gerarUnico(): Promise<string> {
    const MAX_TENTATIVAS = 5;
    for (let i = 0; i < MAX_TENTATIVAS; i++) {
      const protocolo = this.gerarUm();
      const existente = await this.prisma.solicitacao.findUnique({
        where: { protocolo },
        select: { id: true },
      });
      if (!existente) return protocolo;
    }
    throw new InternalServerErrorException(
      'Não foi possível gerar um protocolo único após várias tentativas.',
    );
  }

  private gerarUm(): string {
    const ano = new Date().getFullYear();
    const aleatorio = Math.floor(Math.random() * 900_000 + 100_000);
    return `${ano}${aleatorio}`;
  }
}
