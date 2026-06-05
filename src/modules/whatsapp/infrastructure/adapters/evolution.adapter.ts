import { Injectable, Logger } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { EvolutionCredenciais } from '../../../integracoes/application/integracao.types';
import {
  MensagemEntrante,
  MensagemSaidaWhatsapp,
  ResultadoEnvio,
} from '../../domain/ports/messaging.port';
import { fetchComTimeout, somenteDigitosContato } from './http.util';

/** Recorte do payload `messages.upsert` da Evolution API (v1/v2). */
interface EvolutionMensagemData {
  key?: { remoteJid?: string; fromMe?: boolean; id?: string };
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string; mimetype?: string };
    documentMessage?: { caption?: string; mimetype?: string; fileName?: string };
    /** Presente quando a instância está com WEBHOOK_BASE64 habilitado. */
    base64?: string;
    /** Presente quando a instância armazena mídia em S3/MinIO próprio. */
    mediaUrl?: string;
  };
  messageTimestamp?: number | string;
}

interface EvolutionWebhookPayload {
  event?: string;
  data?: EvolutionMensagemData | EvolutionMensagemData[];
}

/**
 * Adapter da Evolution API (provedor não-oficial — homologação).
 * Stateless: as credenciais vêm por parâmetro porque são geridas em runtime
 * pela tela de Integrações (model `IntegracaoCanal`), sem redeploy.
 */
@Injectable()
export class EvolutionAdapter {
  private readonly logger = new Logger(EvolutionAdapter.name);

  constructor(private readonly minio: MinioService) {}

  async enviarTexto(
    cred: EvolutionCredenciais,
    msg: MensagemSaidaWhatsapp,
  ): Promise<ResultadoEnvio> {
    const base = cred.baseUrl.replace(/\/+$/, '');
    const url = `${base}/message/sendText/${encodeURIComponent(cred.instance)}`;
    const headers = { 'Content-Type': 'application/json', apikey: cred.apiKey };

    // Formato v2: { number, text }. Se a instância for v1, reenvia no formato antigo.
    let resp = await fetchComTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: msg.contato, text: msg.texto }),
    });
    if (resp.status === 400) {
      resp = await fetchComTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ number: msg.contato, textMessage: { text: msg.texto } }),
      });
    }
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      throw new Error(`Evolution sendText falhou (HTTP ${resp.status}): ${corpo.slice(0, 200)}`);
    }
    const json = (await resp.json().catch(() => null)) as { key?: { id?: string } } | null;
    return { idExterno: json?.key?.id ?? null };
  }

  /** Normaliza um webhook da Evolution em mensagens canônicas. */
  async normalizarWebhook(payload: unknown): Promise<MensagemEntrante[]> {
    const corpo = payload as EvolutionWebhookPayload;
    const evento = (corpo?.event ?? '').toString().toLowerCase().replace(/_/g, '.');
    if (evento !== 'messages.upsert') return [];

    const itens = Array.isArray(corpo.data) ? corpo.data : corpo.data ? [corpo.data] : [];
    const mensagens: MensagemEntrante[] = [];

    for (const item of itens) {
      const jid = item.key?.remoteJid ?? '';
      // Só conversa individual de terceiros (ignora nossas, grupos e broadcast).
      if (!jid || item.key?.fromMe || !jid.endsWith('@s.whatsapp.net')) continue;
      const idExterno = item.key?.id;
      if (!idExterno) continue;

      const contato = somenteDigitosContato(jid);
      const recebidoEm = item.messageTimestamp
        ? new Date(Number(item.messageTimestamp) * 1000)
        : new Date();
      const m = item.message ?? {};

      const texto = m.conversation ?? m.extendedTextMessage?.text;
      if (texto) {
        mensagens.push({
          provedor: 'evolution',
          idExterno,
          contato,
          tipo: 'texto',
          texto,
          recebidoEm,
        });
        continue;
      }

      const midia = m.imageMessage ?? m.documentMessage;
      if (midia) {
        // Preferência: base64 do webhook → re-hospeda no nosso MinIO; senão a
        // URL do storage da própria instância (S3/MinIO da Evolution).
        const anexoUrl =
          (await this.subirMidiaBase64(contato, m.base64, midia.mimetype)) ?? m.mediaUrl ?? null;
        mensagens.push({
          provedor: 'evolution',
          idExterno,
          contato,
          tipo: m.imageMessage ? 'imagem' : 'documento',
          texto: midia.caption,
          anexoUrl: anexoUrl ?? undefined,
          recebidoEm,
        });
      }
      // Outros tipos (áudio, sticker, localização...) são ignorados no v1.
    }

    return mensagens;
  }

  /**
   * Sobe a mídia (base64 do webhook) pro nosso MinIO e devolve a URL — o
   * fluxo de UPLOAD/OCR trabalha sempre com URLs do nosso bucket.
   * Sem base64 (WEBHOOK_BASE64 desligado) devolve null; o orquestrador pede
   * pro solicitante reenviar.
   */
  private async subirMidiaBase64(
    contato: string,
    base64?: string,
    mimeType?: string,
  ): Promise<string | null> {
    if (!base64) return null;
    try {
      const buffer = Buffer.from(base64, 'base64');
      const mime = mimeType ?? 'image/jpeg';
      const { url } = await this.minio.upload({
        prefixo: 'whatsapp',
        proprietarioId: contato,
        arquivo: buffer,
        nomeOriginal: `whatsapp.${mime.split('/')[1] ?? 'jpg'}`,
        mimeType: mime,
      });
      return url;
    } catch (err) {
      this.logger.error(`Falha ao subir mídia do WhatsApp: ${(err as Error).message}`);
      return null;
    }
  }
}
