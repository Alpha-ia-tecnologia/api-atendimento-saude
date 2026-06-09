import { BadRequestException, HttpException, Inject, Injectable } from '@nestjs/common';

import { somenteDigitosContato } from '../../../whatsapp/infrastructure/adapters/http.util';
import { MESSAGING_PORT, MessagingPort } from '../../../whatsapp/domain/ports/messaging.port';

const MENSAGEM_TESTE =
  '🤖 Mensagem de teste do *CRM Maria*. Se você recebeu isto, a integração de WhatsApp está funcionando! ✅';

export interface ResultadoEnvioTeste {
  enviado: true;
  /** Número normalizado para onde a mensagem foi enviada (só dígitos, com DDI). */
  contato: string;
  idExterno: string | null;
}

/**
 * Envia uma mensagem de teste pelo provedor ATIVO (o número cadastrado), para
 * o operador confirmar de ponta a ponta que o envio funciona. Distinto do
 * "Testar conexão" (que só checa o estado da instância, sem enviar nada).
 */
@Injectable()
export class EnviarTesteUseCase {
  constructor(@Inject(MESSAGING_PORT) private readonly messaging: MessagingPort) {}

  async execute(numero: string, instanciaId?: string | null): Promise<ResultadoEnvioTeste> {
    const contato = this.normalizar(numero);
    if (contato.length < 10) {
      throw new BadRequestException('Informe um número válido com DDD (ex.: (98) 99999-9999).');
    }

    try {
      const { idExterno } = await this.messaging.enviarTexto(
        { contato, texto: MENSAGEM_TESTE },
        instanciaId ?? null,
      );
      return { enviado: true, contato, idExterno };
    } catch (err) {
      // Sem provedor ativo / credenciais ilegíveis já vêm como HttpException com
      // mensagem clara — preserva. Falha do provedor no envio vira 400 legível.
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(`Não foi possível enviar: ${(err as Error).message}`);
    }
  }

  /** Dígitos + DDI 55 quando o operador digita só DDD + número. */
  private normalizar(numero: string): string {
    const d = somenteDigitosContato(numero);
    return d.length === 10 || d.length === 11 ? `55${d}` : d;
  }
}
