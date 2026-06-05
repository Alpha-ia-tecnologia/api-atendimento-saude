import { ProvedorCanal, StatusIntegracao } from '@prisma/client';

/** Credenciais do provedor Evolution (guardadas cifradas). */
export interface EvolutionCredenciais {
  baseUrl: string;
  instance: string;
  apiKey: string;
}

/** Credenciais do provedor Meta Cloud (guardadas cifradas). */
export interface MetaCredenciais {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
}

/** Resultado de um teste de conexão com o provedor. */
export interface ResultadoTeste {
  status: StatusIntegracao;
  detalhe: string | null;
}

/** Estado de um provedor exposto ao CRM (segredos mascarados). */
export interface ProvedorEstado {
  provedor: ProvedorCanal;
  configurado: boolean;
  ativo: boolean;
  status: StatusIntegracao;
  statusDetalhe: string | null;
  verificadoEm: string | null;
  /**
   * True quando há credenciais salvas mas não foi possível decifrá-las com a
   * `ENCRYPTION_KEY` atual (chave trocada ou dado corrompido) — a tela pede
   * reconfiguração em vez de quebrar.
   */
  ilegivel: boolean;
  /** Campos não-secretos em claro + máscara dos segredos. */
  campos: Record<string, string | null>;
  segredos: Record<string, { definida: boolean; mascara: string | null }>;
}

/** Payload completo da tela de Integrações. */
export interface IntegracoesEstado {
  chaveConfigurada: boolean;
  webhookUrl: string;
  verifyToken: string | null;
  evolution: ProvedorEstado;
  meta: ProvedorEstado;
}
