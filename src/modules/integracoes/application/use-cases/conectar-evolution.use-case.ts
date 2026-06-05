import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProvedorCanal, StatusIntegracao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import { WhatsappTesterService } from '../services/whatsapp-tester.service';
import { lerCredenciais } from '../integracao.mapper';
import { EvolutionCredenciais } from '../integracao.types';

export interface ResultadoConexaoEvolution {
  /** QR Code (data URI base64) pra escanear no aparelho — null se já conectada. */
  qrBase64: string | null;
  /** Código de pareamento alternativo ("conectar com número"). */
  pairingCode: string | null;
  jaConectada: boolean;
}

/**
 * H9.4 — Evolution: gera o QR Code / pareia a instância. Só faz sentido pro
 * provedor Evolution; a Meta conecta por token (sem QR).
 */
@Injectable()
export class ConectarEvolutionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly tester: WhatsappTesterService,
  ) {}

  async execute(): Promise<ResultadoConexaoEvolution> {
    if (!this.crypto.disponivel()) {
      throw new BadRequestException(
        'ENCRYPTION_KEY não configurada no servidor — não é possível ler as credenciais.',
      );
    }
    const row = await this.prisma.integracaoCanal.findUnique({
      where: { provedor: ProvedorCanal.EVOLUTION },
    });
    if (!row?.credenciaisCifradas) {
      throw new NotFoundException('Provedor Evolution ainda não configurado.');
    }
    const { cred, ilegivel } = lerCredenciais<EvolutionCredenciais>(
      this.crypto,
      row.credenciaisCifradas,
    );
    if (ilegivel || !cred) {
      throw new BadRequestException(
        'Não foi possível decifrar as credenciais com a chave atual. Reconfigure o provedor.',
      );
    }

    let resultado: ResultadoConexaoEvolution;
    try {
      resultado = await this.tester.conectarEvolution(cred);
    } catch (err) {
      await this.prisma.integracaoCanal.update({
        where: { provedor: ProvedorCanal.EVOLUTION },
        data: {
          status: StatusIntegracao.ERRO,
          statusDetalhe: (err as Error).message,
          verificadoEm: new Date(),
        },
      });
      throw new BadRequestException((err as Error).message);
    }

    if (resultado.jaConectada) {
      await this.prisma.integracaoCanal.update({
        where: { provedor: ProvedorCanal.EVOLUTION },
        data: {
          status: StatusIntegracao.CONECTADA,
          statusDetalhe: `Instância ${cred.instance} conectada.`,
          verificadoEm: new Date(),
        },
      });
    }

    return resultado;
  }
}
