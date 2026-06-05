/** `fetch` nativo com timeout — mesmo padrão do WhatsappTesterService. */
export async function fetchComTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Mantém só os dígitos de um telefone/remoteJid. */
export function somenteDigitosContato(valor: string): string {
  return (valor.split('@')[0] ?? '').replace(/\D/g, '');
}
