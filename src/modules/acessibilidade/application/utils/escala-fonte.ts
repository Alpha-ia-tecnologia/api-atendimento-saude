import type { Decimal } from '@prisma/client/runtime/library';

/**
 * Escala de fonte tem 2 representações:
 * - **No DB**: Decimal multiplicador (1.00, 1.15, 1.30) — flex pra futuras escalas
 * - **Na API/UI**: índice discreto 0 | 1 | 2 — o usuário escolhe entre 3 botões
 *
 * Aqui é a tradução entre as duas. Mudou os MULTIPLICADORES? Atualize aqui.
 */
export type EscalaFonteIndex = 0 | 1 | 2;

const MULTIPLICADORES: Record<EscalaFonteIndex, number> = {
  0: 1.0,
  1: 1.15,
  2: 1.3,
};

export function indexParaMultiplicador(idx: EscalaFonteIndex): number {
  return MULTIPLICADORES[idx];
}

/** Converte qualquer decimal salvo no DB pro índice mais próximo. */
export function multiplicadorParaIndex(
  mult: Decimal | number | null | undefined,
): EscalaFonteIndex {
  const n = typeof mult === 'number' ? mult : Number(mult ?? 1);
  if (n >= 1.225) return 2;
  if (n >= 1.075) return 1;
  return 0;
}
