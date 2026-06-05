/**
 * Porta de mensageria do WhatsApp (doc 06 — MessagingPort).
 *
 * O domínio não conhece o provedor: `EvolutionAdapter` e `MetaCloudAdapter`
 * implementam o envio/normalização e o `MessagingService` (injetado pelo
 * token `MESSAGING_PORT`) escolhe o adapter conforme o provedor ATIVO na
 * tabela `IntegracaoCanal` — trocar Evolution ↔ Meta não toca no FlowEngine.
 */

/** Mensagem recebida do provedor, já normalizada (canônica). */
export interface MensagemEntrante {
  provedor: 'evolution' | 'meta';
  /** Id da mensagem no provedor — chave de idempotência (reentregas). */
  idExterno: string;
  /** Telefone do solicitante, só dígitos (ex.: 5598999999999). */
  contato: string;
  tipo: 'texto' | 'imagem' | 'documento';
  texto?: string;
  /** URL do anexo já hospedado no NOSSO MinIO (mídia é baixada na normalização). */
  anexoUrl?: string;
  recebidoEm: Date;
}

/** Mensagem de texto a enviar ao solicitante. */
export interface MensagemSaidaWhatsapp {
  /** Telefone destino, só dígitos. */
  contato: string;
  texto: string;
}

export interface ResultadoEnvio {
  /** Id da mensagem no provedor (status de entrega futuro), se informado. */
  idExterno: string | null;
}

export interface MessagingPort {
  /** True quando há provedor ativo e com credenciais legíveis. */
  disponivel(): Promise<boolean>;
  enviarTexto(msg: MensagemSaidaWhatsapp): Promise<ResultadoEnvio>;
  /**
   * Converte um payload bruto de webhook (Evolution ou Meta — detectado pela
   * forma) em mensagens canônicas. Eventos que não são mensagem de usuário
   * (acks, status, grupos, mensagens nossas) viram lista vazia.
   */
  normalizarWebhook(payload: unknown): Promise<MensagemEntrante[]>;
  /** Valida o `hub.verify_token` do handshake de webhook da Meta. */
  verificarTokenMeta(token: string): Promise<boolean>;
}

export const MESSAGING_PORT = Symbol('MESSAGING_PORT');
