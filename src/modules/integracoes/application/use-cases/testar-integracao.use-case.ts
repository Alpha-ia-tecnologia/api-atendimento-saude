import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import { WhatsappTesterService } from '../services/whatsapp-tester.service';
import { lerCredenciais } from '../integracao.mapper';
import { EvolutionCredenciais, MetaCredenciais, ResultadoTeste } from '../integracao.types';

/**
 * Testa a conexão com o provedor e persiste o resultado (status/detalhe/
 * verificadoEm). Retorna o resultado do teste.
 */
@Injectable()
export class TestarIntegracaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly tester: WhatsappTesterService,
  ) {}

  async execute(instanciaId: string): Promise<ResultadoTeste & { verificadoEm: string }> {
    if (!this.crypto.disponivel()) {
      throw new BadRequestException(
        'ENCRYPTION_KEY não configurada no servidor — não é possível ler as credenciais.',
      );
    }
    const row = await this.prisma.instanciaCanal.findUnique({
      where: { id: instanciaId },
    });
    if (!row?.credenciaisCifradas) {
      throw new NotFoundException('Instância ainda não configurada.');
    }

    const { cred, ilegivel } = lerCredenciais<EvolutionCredenciais | MetaCredenciais>(
      this.crypto,
      row.credenciaisCifradas,
    );
    if (ilegivel || !cred) {
      throw new BadRequestException(
        'Não foi possível decifrar as credenciais com a chave atual. Reconfigure a instância.',
      );
    }
    const resultado = await this.tester.testar(row.provedor, cred);

    const verificadoEm = new Date();
    await this.prisma.instanciaCanal.update({
      where: { id: instanciaId },
      data: {
        status: resultado.status,
        statusDetalhe: resultado.detalhe,
        verificadoEm,
      },
    });

    return { ...resultado, verificadoEm: verificadoEm.toISOString() };
  }
}
