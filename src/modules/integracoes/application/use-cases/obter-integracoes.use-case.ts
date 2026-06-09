import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import { lerCredenciais, montarInstanciaEstado } from '../integracao.mapper';
import { EvolutionCredenciais, IntegracoesEstado, MetaCredenciais } from '../integracao.types';
import { montarWebhookUrl } from '../webhook-url.helper';

@Injectable()
export class ObterIntegracoesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  async execute(): Promise<IntegracoesEstado> {
    const linhas = await this.prisma.instanciaCanal.findMany({
      orderBy: [{ provedor: 'asc' }, { criadoEm: 'asc' }],
    });

    const webhookUrl =
      montarWebhookUrl(this.config.get<string>('PUBLIC_BASE_URL')) ?? '/webhooks/whatsapp';

    const instancias = linhas.map((row) => {
      const { cred, ilegivel } = lerCredenciais<EvolutionCredenciais | MetaCredenciais>(
        this.crypto,
        row.credenciaisCifradas,
      );
      return montarInstanciaEstado(row, cred, ilegivel);
    });

    return {
      chaveConfigurada: this.crypto.disponivel(),
      webhookUrl,
      instancias,
    };
  }
}
