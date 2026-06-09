/**
 * Interpolação de templates `{{token}}` nos textos do fluxo do banco.
 * Substitui os tokens computados (primeiroNome, resumoPerfil, especialidadeNome,
 * protocolo) e, por fim, qualquer `{{chave}}` por `variaveis[chave]`.
 *
 * É o equivalente, em dados, às funções de texto do fluxo hardcoded — usado
 * pelo simulador (e, futuramente, pelo motor ao executar do banco).
 */
import { CanalConversa, CanalFluxo } from '@prisma/client';

export type Variaveis = Record<string, unknown>;

/** Mapeia o canal da conversa para o grafo de canal do fluxo (Web e App → WEB_APP). */
export function grupoDoCanal(canal: CanalConversa): CanalFluxo {
  return canal === CanalConversa.WHATSAPP ? CanalFluxo.WHATSAPP : CanalFluxo.WEB_APP;
}

function primeiroNome(v: Variaveis): string {
  const nome =
    String(v.nome ?? '') || String((v._perfil as Record<string, unknown> | undefined)?.nome ?? '');
  return nome.split(' ').filter(Boolean)[0] ?? '';
}

function resumoPerfil(v: Variaveis): string {
  const p = (v._perfil ?? {}) as Record<string, string>;
  return (
    'Encontrei seus dados cadastrados. Confere se está tudo certo:\n\n' +
    `👤 ${p.nome ?? ''}\n` +
    `🪪 CPF: ${p.cpf ?? ''}\n` +
    `📱 ${p.telefone ?? ''}\n` +
    `🏠 ${p.endereco ?? ''}`
  );
}

export function interpolar(texto: string, variaveis: Variaveis): string {
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token: string) => {
    switch (token) {
      case 'primeiroNome':
        return primeiroNome(variaveis);
      case 'resumoPerfil':
        return resumoPerfil(variaveis);
      case 'especialidadeNome':
        return String(variaveis._especialidadeNome ?? '');
      case 'protocolo':
        return String(variaveis._protocolo ?? '');
      default:
        return String(variaveis[token] ?? '');
    }
  });
}
