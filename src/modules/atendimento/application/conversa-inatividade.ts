import { CanalConversa, EstadoConversa, StatusSolicitacao } from '@prisma/client';

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

/**
 * Status de solicitação ainda em curso. Enquanto a solicitação vinculada está
 * num desses, a conversa de WhatsApp NÃO expira por inatividade (o operador
 * pode demorar a responder dentro do SLA).
 */
const STATUS_SOLICITACAO_ABERTA: StatusSolicitacao[] = [
  StatusSolicitacao.SOLICITADA,
  StatusSolicitacao.EM_ATENDIMENTO,
];

/**
 * B5 — Uma conversa de WhatsApp com solicitação ainda em curso
 * (SOLICITADA/EM_ATENDIMENTO) é blindada da expiração por inatividade.
 * Conversas sem solicitação, ou com solicitação já resolvida, expiram normal.
 */
export function solicitacaoBloqueiaExpiracao(
  canal: CanalConversa,
  statusSolicitacao: StatusSolicitacao | null | undefined,
): boolean {
  return (
    canal === CanalConversa.WHATSAPP &&
    !!statusSolicitacao &&
    STATUS_SOLICITACAO_ABERTA.includes(statusSolicitacao)
  );
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
