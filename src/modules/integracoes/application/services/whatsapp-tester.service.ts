import { Injectable, Logger } from '@nestjs/common';
import { ProvedorCanal, StatusIntegracao } from '@prisma/client';

import { EvolutionCredenciais, MetaCredenciais, ResultadoTeste } from '../integracao.types';

/**
 * Testa as credenciais de um provedor de WhatsApp com uma chamada leve via
 * `fetch` nativo (com timeout). Nunca vaza o segredo na resposta/log.
 */
@Injectable()
export class WhatsappTesterService {
  private static readonly TIMEOUT_MS = 8000;
  private static readonly META_API_VERSION = 'v21.0';
  private readonly logger = new Logger(WhatsappTesterService.name);

  async testarEvolution(cred: EvolutionCredenciais): Promise<ResultadoTeste> {
    if (!cred.baseUrl || !cred.instance || !cred.apiKey) {
      return { status: StatusIntegracao.ERRO, detalhe: 'Credenciais incompletas.' };
    }
    const base = cred.baseUrl.replace(/\/+$/, '');
    const url = `${base}/instance/connectionState/${encodeURIComponent(cred.instance)}`;
    try {
      const resp = await this.fetchComTimeout(url, {
        headers: { apikey: cred.apiKey },
      });
      if (!resp.ok) {
        return {
          status: StatusIntegracao.ERRO,
          detalhe: `HTTP ${resp.status} ao consultar a instância.`,
        };
      }
      const corpo = (await resp.json().catch(() => null)) as {
        instance?: { state?: string };
        state?: string;
      } | null;
      const estado = corpo?.instance?.state ?? corpo?.state ?? 'desconhecido';
      return {
        status: StatusIntegracao.CONECTADA,
        detalhe: `Instância ${cred.instance} (${estado}).`,
      };
    } catch (err) {
      return { status: StatusIntegracao.ERRO, detalhe: this.mensagemErro(err) };
    }
  }

  async testarMeta(cred: MetaCredenciais): Promise<ResultadoTeste> {
    if (!cred.phoneNumberId || !cred.accessToken) {
      return { status: StatusIntegracao.ERRO, detalhe: 'Credenciais incompletas.' };
    }
    const url =
      `https://graph.facebook.com/${WhatsappTesterService.META_API_VERSION}/` +
      `${encodeURIComponent(cred.phoneNumberId)}?fields=display_phone_number,verified_name`;
    try {
      const resp = await this.fetchComTimeout(url, {
        headers: { Authorization: `Bearer ${cred.accessToken}` },
      });
      const corpo = (await resp.json().catch(() => null)) as {
        display_phone_number?: string;
        verified_name?: string;
        error?: { message?: string };
      } | null;
      if (!resp.ok) {
        return {
          status: StatusIntegracao.ERRO,
          detalhe: corpo?.error?.message ?? `HTTP ${resp.status} no Graph API.`,
        };
      }
      const numero = corpo?.display_phone_number ?? cred.phoneNumberId;
      const nome = corpo?.verified_name ? ` — ${corpo.verified_name}` : '';
      return {
        status: StatusIntegracao.CONECTADA,
        detalhe: `${numero}${nome}.`,
      };
    } catch (err) {
      return { status: StatusIntegracao.ERRO, detalhe: this.mensagemErro(err) };
    }
  }

  testar(
    provedor: ProvedorCanal,
    cred: EvolutionCredenciais | MetaCredenciais,
  ): Promise<ResultadoTeste> {
    return provedor === ProvedorCanal.EVOLUTION
      ? this.testarEvolution(cred as EvolutionCredenciais)
      : this.testarMeta(cred as MetaCredenciais);
  }

  /**
   * Evolution: pede o pareamento da instância. Quando ainda não conectada, o
   * provedor devolve o QR Code (base64) e/ou o código de pareamento — é o que
   * a tela de Integrações exibe pro ADMIN escanear no aparelho.
   */
  async conectarEvolution(cred: EvolutionCredenciais): Promise<{
    qrBase64: string | null;
    pairingCode: string | null;
    jaConectada: boolean;
  }> {
    const base = cred.baseUrl.replace(/\/+$/, '');
    const url = `${base}/instance/connect/${encodeURIComponent(cred.instance)}`;
    const resp = await this.fetchComTimeout(url, { headers: { apikey: cred.apiKey } });
    const corpo = (await resp.json().catch(() => null)) as {
      base64?: string;
      code?: string;
      pairingCode?: string;
      instance?: { state?: string };
    } | null;
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ao conectar a instância ${cred.instance}.`);
    }
    const estado = corpo?.instance?.state;
    return {
      qrBase64: corpo?.base64 ?? null,
      pairingCode: corpo?.pairingCode ?? null,
      jaConectada: estado === 'open',
    };
  }

  /**
   * Registra na instância da Evolution o webhook que recebe as mensagens
   * (`POST /webhook/set/{instance}`), assinando só `MESSAGES_UPSERT` — o único
   * evento que o `EvolutionAdapter.normalizarWebhook` interpreta. Sem isso a
   * instância parea o aparelho mas nunca entrega as mensagens à API.
   *
   * `webhookUrl` é a URL pública do backend (montada de `PUBLIC_BASE_URL`); a
   * Evolution precisa alcançá-la, então não pode ser `localhost`.
   */
  async configurarWebhookEvolution(cred: EvolutionCredenciais, webhookUrl: string): Promise<void> {
    const base = cred.baseUrl.replace(/\/+$/, '');
    const url = `${base}/webhook/set/${encodeURIComponent(cred.instance)}`;
    const headers = { 'Content-Type': 'application/json', apikey: cred.apiKey };
    const eventos = ['MESSAGES_UPSERT'];

    // Formato v2: { webhook: { ... } }. Se a instância for v1, o corpo é achatado.
    let resp = await this.fetchComTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, events: eventos },
      }),
    });
    if (resp.status === 400) {
      resp = await this.fetchComTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enabled: true,
          url: webhookUrl,
          webhook_by_events: false,
          events: eventos,
        }),
      });
    }
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      throw new Error(
        `Falha ao registrar o webhook na Evolution (HTTP ${resp.status}): ${corpo.slice(0, 200)}`,
      );
    }
  }

  private async fetchComTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WhatsappTesterService.TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private mensagemErro(err: unknown): string {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'Tempo de conexão esgotado (provedor não respondeu).';
    }
    const msg = err instanceof Error ? err.message : 'Falha na conexão.';
    this.logger.warn(`Teste de conexão falhou: ${msg}`);
    return msg;
  }
}
