import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProvedorCanal } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import { lerCredenciais, montarProvedorEstado } from '../integracao.mapper';
import { EvolutionCredenciais, IntegracoesEstado, MetaCredenciais } from '../integracao.types';

@Injectable()
export class ObterIntegracoesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  async execute(): Promise<IntegracoesEstado> {
    const linhas = await this.prisma.integracaoCanal.findMany();
    const evolutionRow = linhas.find((l) => l.provedor === ProvedorCanal.EVOLUTION);
    const metaRow = linhas.find((l) => l.provedor === ProvedorCanal.META);

    const evolution = lerCredenciais<EvolutionCredenciais>(
      this.crypto,
      evolutionRow?.credenciaisCifradas ?? null,
    );
    const meta = lerCredenciais<MetaCredenciais>(this.crypto, metaRow?.credenciaisCifradas ?? null);

    const base = this.config.get<string>('PUBLIC_BASE_URL')?.trim();
    const webhookUrl = base
      ? `${base.replace(/\/+$/, '')}/webhooks/whatsapp`
      : '/webhooks/whatsapp';

    return {
      chaveConfigurada: this.crypto.disponivel(),
      webhookUrl,
      verifyToken: meta.cred?.verifyToken ?? null,
      evolution: montarProvedorEstado(
        ProvedorCanal.EVOLUTION,
        evolutionRow,
        evolution.cred,
        evolution.ilegivel,
      ),
      meta: montarProvedorEstado(ProvedorCanal.META, metaRow, meta.cred, meta.ilegivel),
    };
  }
}
