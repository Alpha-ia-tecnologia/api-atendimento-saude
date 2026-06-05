import { IntegracaoCanal, ProvedorCanal } from '@prisma/client';

import { CryptoService } from '../../../shared/crypto/crypto.service';
import { EvolutionCredenciais, MetaCredenciais, ProvedorEstado } from './integracao.types';

/** Mostra só os últimos 4 caracteres de um segredo (ou null se ausente). */
export function mascararSegredo(valor?: string | null): string | null {
  if (!valor) return null;
  const v = valor.trim();
  if (v.length <= 4) return '••••';
  return `••••${v.slice(-4)}`;
}

/** Resultado de uma tentativa de leitura de credenciais cifradas. */
export interface LeituraCredenciais<T> {
  /** Credenciais decifradas, ou null se sem chave/sem dado/ilegível. */
  cred: T | null;
  /** True se havia dado cifrado mas a chave atual não o decifra. */
  ilegivel: boolean;
}

/**
 * Tenta decifrar o JSON de credenciais de uma linha SEM lançar: se a chave
 * atual não bate (GCM rejeita) ou o dado está corrompido, retorna
 * `{ cred: null, ilegivel: true }` para a tela pedir reconfiguração.
 */
export function lerCredenciais<T>(
  crypto: CryptoService,
  cifrado: string | null,
): LeituraCredenciais<T> {
  if (!cifrado || !crypto.disponivel()) return { cred: null, ilegivel: false };
  try {
    return { cred: JSON.parse(crypto.decrypt(cifrado)) as T, ilegivel: false };
  } catch {
    return { cred: null, ilegivel: true };
  }
}

/** Monta o estado de um provedor para o CRM (segredos mascarados). */
export function montarProvedorEstado(
  provedor: ProvedorCanal,
  row: IntegracaoCanal | undefined,
  cred: EvolutionCredenciais | MetaCredenciais | null,
  ilegivel = false,
): ProvedorEstado {
  const temCifrado = !!row?.credenciaisCifradas;

  const campos: Record<string, string | null> =
    provedor === ProvedorCanal.EVOLUTION
      ? {
          baseUrl: (cred as EvolutionCredenciais | null)?.baseUrl ?? null,
          instance: (cred as EvolutionCredenciais | null)?.instance ?? null,
        }
      : {
          wabaId: (cred as MetaCredenciais | null)?.wabaId ?? null,
          phoneNumberId: (cred as MetaCredenciais | null)?.phoneNumberId ?? null,
          verifyToken: (cred as MetaCredenciais | null)?.verifyToken ?? null,
        };

  const segredoValor =
    provedor === ProvedorCanal.EVOLUTION
      ? (cred as EvolutionCredenciais | null)?.apiKey
      : (cred as MetaCredenciais | null)?.accessToken;
  const nomeSegredo = provedor === ProvedorCanal.EVOLUTION ? 'apiKey' : 'accessToken';

  const segredos: ProvedorEstado['segredos'] = {
    [nomeSegredo]: {
      definida: cred ? !!segredoValor : temCifrado,
      mascara: mascararSegredo(segredoValor),
    },
  };

  return {
    provedor,
    configurado: temCifrado,
    ilegivel,
    ativo: row?.ativo ?? false,
    status: row?.status ?? 'DESCONECTADA',
    statusDetalhe: row?.statusDetalhe ?? null,
    verificadoEm: row?.verificadoEm ? row.verificadoEm.toISOString() : null,
    campos,
    segredos,
  };
}
