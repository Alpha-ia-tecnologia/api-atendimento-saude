import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ProvedorCanal } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import { lerCredenciais } from '../../../integracoes/application/integracao.mapper';
import {
  EvolutionCredenciais,
  MetaCredenciais,
} from '../../../integracoes/application/integracao.types';
import {
  MensagemEntrante,
  MensagemSaidaWhatsapp,
  MessagingPort,
  ResultadoEnvio,
} from '../../domain/ports/messaging.port';
import { EvolutionAdapter } from '../../infrastructure/adapters/evolution.adapter';
import { MetaCloudAdapter } from '../../infrastructure/adapters/meta-cloud.adapter';

/**
 * Implementação do `MessagingPort`: resolve o provedor ATIVO (e suas
 * credenciais cifradas) na `IntegracaoCanal` A CADA chamada — o ADMIN pode
 * trocar Evolution ↔ Meta pela tela de Integrações sem redeploy.
 */
@Injectable()
export class MessagingService implements MessagingPort {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly evolution: EvolutionAdapter,
    private readonly meta: MetaCloudAdapter,
  ) {}

  async disponivel(): Promise<boolean> {
    try {
      await this.provedorAtivo();
      return true;
    } catch {
      return false;
    }
  }

  async enviarTexto(msg: MensagemSaidaWhatsapp): Promise<ResultadoEnvio> {
    const ativo = await this.provedorAtivo();
    return ativo.provedor === ProvedorCanal.EVOLUTION
      ? this.evolution.enviarTexto(ativo.cred as EvolutionCredenciais, msg)
      : this.meta.enviarTexto(ativo.cred as MetaCredenciais, msg);
  }

  /** Detecta o provedor pela FORMA do payload (os dois usam a mesma rota). */
  async normalizarWebhook(payload: unknown): Promise<MensagemEntrante[]> {
    const ehMeta = (payload as { object?: string })?.object === 'whatsapp_business_account';
    if (ehMeta) {
      return this.meta.normalizarWebhook(
        await this.credenciais<MetaCredenciais>(ProvedorCanal.META),
        payload,
      );
    }
    return this.evolution.normalizarWebhook(payload);
  }

  async verificarTokenMeta(token: string): Promise<boolean> {
    const cred = await this.credenciais<MetaCredenciais>(ProvedorCanal.META);
    return !!cred?.verifyToken && cred.verifyToken === token;
  }

  // ---------------------------------------------------------------- privados

  private async provedorAtivo(): Promise<{
    provedor: ProvedorCanal;
    cred: EvolutionCredenciais | MetaCredenciais;
  }> {
    const row = await this.prisma.integracaoCanal.findFirst({ where: { ativo: true } });
    if (!row) {
      throw new ServiceUnavailableException(
        'Nenhum provedor de WhatsApp ativo — configure na tela de Integrações.',
      );
    }
    const { cred, ilegivel } = lerCredenciais<EvolutionCredenciais | MetaCredenciais>(
      this.crypto,
      row.credenciaisCifradas,
    );
    if (!cred) {
      this.logger.error(
        `Credenciais do provedor ${row.provedor} ${ilegivel ? 'ilegíveis (ENCRYPTION_KEY trocada?)' : 'ausentes'}.`,
      );
      throw new ServiceUnavailableException('Credenciais do provedor de WhatsApp indisponíveis.');
    }
    return { provedor: row.provedor, cred };
  }

  private async credenciais<T>(provedor: ProvedorCanal): Promise<T | null> {
    const row = await this.prisma.integracaoCanal.findUnique({ where: { provedor } });
    return lerCredenciais<T>(this.crypto, row?.credenciaisCifradas ?? null).cred;
  }
}
