import { Injectable, Logger } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { MetaCredenciais } from '../../../integracoes/application/integracao.types';
import {
  MensagemDocumentoWhatsapp,
  MensagemEntrante,
  MensagemSaidaWhatsapp,
  ResultadoEnvio,
} from '../../domain/ports/messaging.port';
import { fetchComTimeout, somenteDigitosContato } from './http.util';

/** Recorte do webhook oficial da Meta (Cloud API). */
interface MetaWebhookMensagem {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; caption?: string; filename?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
}

interface MetaWebhookPayload {
  object?: string;
  entry?: { changes?: { value?: { messages?: MetaWebhookMensagem[] } }[] }[];
}

/**
 * Adapter da WhatsApp Business Cloud API (oficial — RNF18).
 * Envio livre dentro da janela de 24h (o atendimento é sempre responsivo,
 * então estamos dentro da janela); templates aprovados ficam pra notificação
 * ativa (fase posterior).
 */
@Injectable()
export class MetaCloudAdapter {
  private static readonly API = 'https://graph.facebook.com/v21.0';
  private readonly logger = new Logger(MetaCloudAdapter.name);

  constructor(private readonly minio: MinioService) {}

  async enviarTexto(cred: MetaCredenciais, msg: MensagemSaidaWhatsapp): Promise<ResultadoEnvio> {
    const url = `${MetaCloudAdapter.API}/${encodeURIComponent(cred.phoneNumberId)}/messages`;
    const resp = await fetchComTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cred.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.contato,
        type: 'text',
        text: { body: msg.texto },
      }),
    });
    const json = (await resp.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    } | null;
    if (!resp.ok) {
      throw new Error(`Meta /messages falhou (HTTP ${resp.status}): ${json?.error?.message ?? ''}`);
    }
    return { idExterno: json?.messages?.[0]?.id ?? null };
  }

  async enviarDocumento(
    cred: MetaCredenciais,
    msg: MensagemDocumentoWhatsapp,
  ): Promise<ResultadoEnvio> {
    const url = `${MetaCloudAdapter.API}/${encodeURIComponent(cred.phoneNumberId)}/messages`;
    const resp = await fetchComTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cred.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.contato,
        type: 'document',
        document: {
          link: msg.documentoUrl,
          filename: msg.nomeArquivo,
          caption: msg.legenda,
        },
      }),
    });
    const json = (await resp.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    } | null;
    if (!resp.ok) {
      throw new Error(`Meta /messages falhou (HTTP ${resp.status}): ${json?.error?.message ?? ''}`);
    }
    return { idExterno: json?.messages?.[0]?.id ?? null };
  }

  /** Normaliza o webhook oficial (`messages`; `statuses` é ignorado no v1). */
  async normalizarWebhook(
    cred: MetaCredenciais | null,
    payload: unknown,
  ): Promise<MensagemEntrante[]> {
    const corpo = payload as MetaWebhookPayload;
    if (corpo?.object !== 'whatsapp_business_account') return [];

    const mensagens: MensagemEntrante[] = [];
    for (const entry of corpo.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const m of change.value?.messages ?? []) {
          if (!m.id || !m.from) continue;
          const base = {
            provedor: 'meta' as const,
            idExterno: m.id,
            contato: somenteDigitosContato(m.from),
            recebidoEm: m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date(),
          };

          if (m.type === 'text' && m.text?.body) {
            mensagens.push({ ...base, tipo: 'texto', texto: m.text.body });
          } else if (m.type === 'interactive') {
            const reply = m.interactive?.button_reply ?? m.interactive?.list_reply;
            if (reply?.id ?? reply?.title) {
              mensagens.push({ ...base, tipo: 'texto', texto: reply?.title ?? reply?.id });
            }
          } else if (m.type === 'image' || m.type === 'document') {
            const midia = m.type === 'image' ? m.image : m.document;
            const anexoUrl = midia?.id
              ? await this.baixarMidia(cred, base.contato, midia.id, midia.mime_type)
              : null;
            mensagens.push({
              ...base,
              tipo: m.type === 'image' ? 'imagem' : 'documento',
              texto: midia?.caption,
              anexoUrl: anexoUrl ?? undefined,
            });
          }
        }
      }
    }
    return mensagens;
  }

  /**
   * Mídia na Meta vem como id: busca a URL temporária no Graph, baixa com o
   * token e re-hospeda no nosso MinIO (o fluxo de UPLOAD/OCR usa nossas URLs).
   */
  private async baixarMidia(
    cred: MetaCredenciais | null,
    contato: string,
    mediaId: string,
    mimeType?: string,
  ): Promise<string | null> {
    if (!cred?.accessToken) return null;
    try {
      const auth = { Authorization: `Bearer ${cred.accessToken}` };
      const meta = await fetchComTimeout(`${MetaCloudAdapter.API}/${mediaId}`, { headers: auth });
      const info = (await meta.json().catch(() => null)) as { url?: string } | null;
      if (!meta.ok || !info?.url) return null;

      const arquivo = await fetchComTimeout(info.url, { headers: auth }, 20_000);
      if (!arquivo.ok) return null;
      const buffer = Buffer.from(await arquivo.arrayBuffer());

      const mime = mimeType ?? arquivo.headers.get('content-type') ?? 'image/jpeg';
      const { url } = await this.minio.upload({
        prefixo: 'whatsapp',
        proprietarioId: contato,
        arquivo: buffer,
        nomeOriginal: `whatsapp.${mime.split('/')[1] ?? 'jpg'}`,
        mimeType: mime,
      });
      return url;
    } catch (err) {
      this.logger.error(`Falha ao baixar mídia da Meta: ${(err as Error).message}`);
      return null;
    }
  }
}
