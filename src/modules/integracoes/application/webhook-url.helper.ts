/**
 * Monta a URL pública do webhook de WhatsApp a partir do `PUBLIC_BASE_URL`.
 *
 * Essa é a URL que os provedores (Evolution/Meta) chamam ao receber uma
 * mensagem, então precisa ser um endereço alcançável de onde o provedor roda —
 * por isso depende do domínio público do backend, não de `localhost`.
 *
 * Retorna `null` quando a base não está configurada: sem domínio público não há
 * como o provedor entregar as mensagens, e quem chama deve tratar esse caso.
 */
export function montarWebhookUrl(publicBaseUrl: string | undefined | null): string | null {
  const base = publicBaseUrl?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/webhooks/whatsapp`;
}
