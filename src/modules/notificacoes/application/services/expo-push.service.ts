import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Limite de mensagens por request documentado pelo Expo Push Service. */
const TAMANHO_LOTE = 100;

/** Ticket de resposta do Expo (1 por mensagem, na mesma ordem). */
interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ConteudoPush {
  titulo: string;
  corpo: string;
  /** Vai em `data` — o app usa pra navegar ao tocar. */
  dados?: Record<string, unknown>;
}

/**
 * Envia push real pros aparelhos do solicitante via Expo Push Service.
 * Sem SDK externo: a API é um POST JSON simples. NUNCA lança — push é
 * melhor-esforço (a notificação in-app já está persistida de qualquer jeito).
 * Tokens que o Expo reportar como DeviceNotRegistered são desativados.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly prisma: PrismaService) {}

  async enviarParaUsuario(usuarioMariaId: string, conteudo: ConteudoPush): Promise<void> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { usuarioMariaId, ativo: true },
        select: { token: true },
      });
      if (tokens.length === 0) return;

      const mensagens = tokens.map((t) => ({
        to: t.token,
        title: conteudo.titulo,
        body: conteudo.corpo,
        data: conteudo.dados ?? {},
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      }));

      for (let i = 0; i < mensagens.length; i += TAMANHO_LOTE) {
        await this.enviarLote(mensagens.slice(i, i + TAMANHO_LOTE));
      }
    } catch (err) {
      this.logger.error(`Push pro usuário ${usuarioMariaId} falhou: ${(err as Error).message}`);
    }
  }

  private async enviarLote(mensagens: { to: string }[]): Promise<void> {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensagens),
    });
    if (!resp.ok) {
      this.logger.warn(`Expo Push respondeu ${resp.status}: ${await resp.text()}`);
      return;
    }

    const { data } = (await resp.json()) as { data?: ExpoPushTicket[] };
    if (!Array.isArray(data)) return;

    // Tickets vêm na mesma ordem das mensagens — token morto é desativado
    // pra não insistir em aparelho que desinstalou o app.
    const mortos = mensagens
      .filter((_, i) => data[i]?.details?.error === 'DeviceNotRegistered')
      .map((m) => m.to);
    if (mortos.length > 0) {
      await this.prisma.deviceToken.updateMany({
        where: { token: { in: mortos } },
        data: { ativo: false },
      });
      this.logger.log(`${mortos.length} device token(s) desativado(s) (DeviceNotRegistered).`);
    }

    for (const t of data) {
      if (t.status === 'error' && t.details?.error !== 'DeviceNotRegistered') {
        this.logger.warn(`Ticket de push com erro: ${t.message ?? t.details?.error}`);
      }
    }
  }
}
