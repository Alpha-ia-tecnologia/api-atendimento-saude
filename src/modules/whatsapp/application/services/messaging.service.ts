import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InstanciaCanal, ProvedorCanal } from '@prisma/client';

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
 * Implementação do `MessagingPort`. Há VÁRIAS instâncias por provedor na
 * `InstanciaCanal`: o envio usa a instância informada (ou a padrão `ativo`),
 * e o webhook de entrada resolve a instância de origem pelo identificador do
 * payload (instance name na Evolution, phoneNumberId na Meta).
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
      await this.resolverEnvio(null);
      return true;
    } catch {
      return false;
    }
  }

  async enviarTexto(
    msg: MensagemSaidaWhatsapp,
    instanciaId?: string | null,
  ): Promise<ResultadoEnvio> {
    const { provedor, cred } = await this.resolverEnvio(instanciaId ?? null);
    return provedor === ProvedorCanal.EVOLUTION
      ? this.evolution.enviarTexto(cred as EvolutionCredenciais, msg)
      : this.meta.enviarTexto(cred as MetaCredenciais, msg);
  }

  /**
   * Detecta o provedor pela FORMA do payload (os dois usam a mesma rota) e
   * resolve a instância de origem pelo identificador, anexando-a às mensagens.
   */
  async normalizarWebhook(payload: unknown): Promise<MensagemEntrante[]> {
    const ehMeta = (payload as { object?: string })?.object === 'whatsapp_business_account';

    if (ehMeta) {
      const phoneNumberId = this.phoneNumberIdDoPayload(payload);
      const instancia = await this.instanciaPorIdentificador(ProvedorCanal.META, phoneNumberId);
      const cred = instancia
        ? lerCredenciais<MetaCredenciais>(this.crypto, instancia.credenciaisCifradas).cred
        : null;
      const mensagens = await this.meta.normalizarWebhook(cred, payload);
      return mensagens.map((m) => ({ ...m, instanciaCanalId: instancia?.id ?? null }));
    }

    const instanceName = (payload as { instance?: string })?.instance ?? null;
    const instancia = await this.instanciaPorIdentificador(ProvedorCanal.EVOLUTION, instanceName);
    const mensagens = await this.evolution.normalizarWebhook(payload);
    return mensagens.map((m) => ({ ...m, instanciaCanalId: instancia?.id ?? null }));
  }

  /** Aceita o verify_token de QUALQUER instância Meta configurada. */
  async verificarTokenMeta(token: string): Promise<boolean> {
    if (!token) return false;
    const metas = await this.prisma.instanciaCanal.findMany({
      where: { provedor: ProvedorCanal.META },
    });
    return metas.some((row) => {
      const cred = lerCredenciais<MetaCredenciais>(this.crypto, row.credenciaisCifradas).cred;
      return !!cred?.verifyToken && cred.verifyToken === token;
    });
  }

  // ---------------------------------------------------------------- privados

  /** Resolve (instância + credenciais) para envio: por id, ou a padrão. */
  private async resolverEnvio(instanciaId: string | null): Promise<{
    provedor: ProvedorCanal;
    cred: EvolutionCredenciais | MetaCredenciais;
  }> {
    const row = instanciaId
      ? await this.prisma.instanciaCanal.findUnique({ where: { id: instanciaId } })
      : await this.prisma.instanciaCanal.findFirst({ where: { ativo: true } });

    if (!row) {
      throw new ServiceUnavailableException(
        instanciaId
          ? 'Instância de WhatsApp não encontrada.'
          : 'Nenhuma instância de WhatsApp padrão — configure na tela de Integrações.',
      );
    }

    const { cred, ilegivel } = lerCredenciais<EvolutionCredenciais | MetaCredenciais>(
      this.crypto,
      row.credenciaisCifradas,
    );
    if (!cred) {
      this.logger.error(
        `Credenciais da instância ${row.nome} (${row.provedor}) ${ilegivel ? 'ilegíveis (ENCRYPTION_KEY trocada?)' : 'ausentes'}.`,
      );
      throw new ServiceUnavailableException('Credenciais da instância de WhatsApp indisponíveis.');
    }
    return { provedor: row.provedor, cred };
  }

  /**
   * Casa o webhook de entrada com a instância pelo identificador. Sem casar
   * (identificador null/desconhecido — ex.: instância ainda não resincronizada
   * pós-migração), cai na padrão do provedor para não perder a mensagem.
   */
  private async instanciaPorIdentificador(
    provedor: ProvedorCanal,
    identificador: string | null,
  ): Promise<InstanciaCanal | null> {
    if (identificador) {
      const exata = await this.prisma.instanciaCanal.findFirst({
        where: { provedor, identificadorExterno: identificador },
      });
      if (exata) return exata;
      this.logger.warn(
        `Webhook ${provedor} sem instância para "${identificador}" — usando a padrão do provedor.`,
      );
    }
    return this.prisma.instanciaCanal.findFirst({
      where: { provedor },
      orderBy: [{ ativo: 'desc' }, { criadoEm: 'asc' }],
    });
  }

  /** Extrai o phoneNumberId do 1º entry/change do payload da Meta. */
  private phoneNumberIdDoPayload(payload: unknown): string | null {
    const corpo = payload as {
      entry?: { changes?: { value?: { metadata?: { phone_number_id?: string } } }[] }[];
    };
    for (const entry of corpo?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const id = change.value?.metadata?.phone_number_id;
        if (id) return id;
      }
    }
    return null;
  }
}
