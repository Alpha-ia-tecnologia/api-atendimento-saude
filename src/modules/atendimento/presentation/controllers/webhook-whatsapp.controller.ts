import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { MESSAGING_PORT, MessagingPort } from '../../../whatsapp/domain/ports/messaging.port';
import { ProcessarWebhookWhatsappUseCase } from '../../application/use-cases/processar-webhook-whatsapp.use-case';

/**
 * Webhook público de WhatsApp (Evolution e Meta na MESMA rota — o provedor é
 * detectado pela forma do payload). Fora do Swagger: não é API de cliente.
 */
@ApiExcludeController()
@Controller('webhooks/whatsapp')
export class WebhookWhatsappController {
  constructor(
    private readonly processar: ProcessarWebhookWhatsappUseCase,
    @Inject(MESSAGING_PORT) private readonly messaging: MessagingPort,
  ) {}

  /**
   * Handshake de verificação da Meta: responde o `hub.challenge` cru quando o
   * `hub.verify_token` confere com o configurado na tela de Integrações.
   */
  @Get()
  async verificar(
    @Query('hub.mode') modo: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const valido =
      modo === 'subscribe' && !!challenge && (await this.messaging.verificarTokenMeta(token ?? ''));
    if (valido) {
      res.status(HttpStatus.OK).send(challenge);
      return;
    }
    res.status(HttpStatus.FORBIDDEN).send('verify_token inválido');
  }

  /**
   * Recebe mensagens dos provedores. Sempre devolve 200 rápido — qualquer
   * falha interna fica no log (o provedor reentrega; a idempotência segura).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receber(@Body() payload: unknown): Promise<{ recebido: boolean }> {
    await this.processar.execute(payload);
    return { recebido: true };
  }
}
