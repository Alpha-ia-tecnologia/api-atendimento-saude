import { EstadoConversa } from '@prisma/client';

/**
 * Regra de expiração por inatividade (todos os canais — App/Web e WhatsApp):
 * uma conversa ativa parada por mais que esta janela é considerada EXPIRADA.
 * O cliente não retoma o fluxo de onde parou — uma nova mensagem inicia outra
 * conversa do começo.
 */
export const JANELA_INATIVIDADE_MS = 24 * 60 * 60 * 1000; // 24 horas

/** Estados em que a conversa ainda está "viva" (pode receber/continuar). */
export const ESTADOS_ATIVOS: EstadoConversa[] = [
  EstadoConversa.ABERTA,
  EstadoConversa.EM_ANDAMENTO,
  EstadoConversa.AGUARDANDO_SOLICITANTE,
];

/** Interações anteriores a este instante contam como inativas. */
export function limiteInatividade(agora: Date = new Date()): Date {
  return new Date(agora.getTime() - JANELA_INATIVIDADE_MS);
}

/** Conversa ativa cuja última interação passou da janela de 24h. */
export function expirouPorInatividade(
  estado: EstadoConversa,
  ultimaInteracaoEm: Date,
  agora: Date = new Date(),
): boolean {
  return (
    ESTADOS_ATIVOS.includes(estado) &&
    ultimaInteracaoEm.getTime() < agora.getTime() - JANELA_INATIVIDADE_MS
  );
}
