/** Remove tudo que não é dígito. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** "14/03/1952" → Date 1952-03-14 (UTC). */
export function parseDataBR(valor: string): Date {
  const [dia, mes, ano] = valor.split('/').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Date | null → "yyyy-mm-dd" | null. */
export function formatarDataISO(data: Date | null): string | null {
  return data ? data.toISOString().slice(0, 10) : null;
}
