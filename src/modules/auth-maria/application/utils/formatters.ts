/** Remove tudo que não é dígito. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** "14/03/1952" → Date 1952-03-14 00:00:00 UTC (apenas dia). */
export function parseDataNascimentoBR(valor: string): Date {
  const [dia, mes, ano] = valor.split('/').map(Number);
  // Constrói em UTC pra evitar timezone shift no campo @db.Date.
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Date → "dd/mm/aaaa" para exibição. */
export function formatarDataNascimentoBR(data: Date): string {
  const d = String(data.getUTCDate()).padStart(2, '0');
  const m = String(data.getUTCMonth() + 1).padStart(2, '0');
  const y = data.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/** Date → "yyyy-mm-dd" para JSON. */
export function formatarDataNascimentoISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}
