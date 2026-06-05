import { TipoNoFluxo } from '@prisma/client';

import { interpolar } from '../../../fluxos/application/fluxo-interpolacao';
import { CampoTexto, Fluxo, No, OpcaoFluxo, Texto, Variaveis } from './tipos';

/**
 * Converte uma versão de fluxo do banco (nós + arestas) no objeto `Fluxo` que o
 * `FlowEngineService` interpreta — sem nenhuma mudança no motor. O contrário do
 * que o seed fez ao migrar o fluxo hardcoded pro banco.
 *
 * Espelha o mapeamento do `SimuladorFluxoService`, mas produz o grafo executável
 * (com efeitos reais) em vez de um passo dry-run.
 *
 * - Textos com `{{var}}` viram funções `(v) => interpolar(t, v)` (o motor já
 *   aceita `Texto = string | função`).
 * - O nó `INICIO` não existe no motor: `fluxo.inicial` aponta pro destino dele.
 *   Sem `INICIO`, usa o nó marcado `ehInicial` (compatível com o seed).
 */
export interface NoBanco {
  id: string;
  chave: string;
  tipo: TipoNoFluxo;
  conteudo: unknown;
  ehInicial: boolean;
}

export interface ArestaBanco {
  noOrigemId: string;
  noDestinoId: string;
  condicao: unknown;
  ordem: number;
}

interface Saida {
  destino: string;
  condicao: Record<string, unknown>;
}

export function materializarFluxo(chave: string, nos: NoBanco[], arestas: ArestaBanco[]): Fluxo {
  const idParaChave = new Map<string, string>();
  for (const n of nos) idParaChave.set(n.id, n.chave);

  // Arestas de saída por chave de origem, ordenadas.
  const saidas = new Map<string, Saida[]>();
  for (const a of [...arestas].sort((x, y) => x.ordem - y.ordem)) {
    const origem = idParaChave.get(a.noOrigemId);
    const destino = idParaChave.get(a.noDestinoId);
    if (!origem || !destino) continue;
    const lista = saidas.get(origem) ?? [];
    lista.push({ destino, condicao: (a.condicao ?? {}) as Record<string, unknown> });
    saidas.set(origem, lista);
  }

  const destinoSempre = (chaveNo: string): string => {
    const lista = saidas.get(chaveNo) ?? [];
    const sempre = lista.find((s) => s.condicao?.tipo !== 'opcao');
    return (sempre ?? lista[0])?.destino ?? '';
  };

  const ramosDe = (chaveNo: string): Record<string, string> => {
    const ramos: Record<string, string> = {};
    for (const s of saidas.get(chaveNo) ?? []) {
      if (s.condicao?.tipo === 'opcao' && s.condicao.valor != null) {
        ramos[String(s.condicao.valor)] = s.destino;
      }
    }
    return ramos;
  };

  const textosDe = (conteudo: Record<string, unknown>): Texto[] => {
    const brutos = (conteudo.textos as string[] | undefined) ?? [];
    return brutos
      .filter((t) => typeof t === 'string')
      .map(
        (t): Texto =>
          (v: Variaveis) =>
            interpolar(t, v),
      );
  };

  const nosFluxo: Record<string, No> = {};
  let inicialPorInicio: string | null = null;
  let inicialPorFlag: string | null = null;

  for (const n of nos) {
    const conteudo = (n.conteudo ?? {}) as Record<string, unknown>;

    switch (n.tipo) {
      case TipoNoFluxo.INICIO:
        // Não é um nó do motor: o início é o destino dele.
        inicialPorInicio = destinoSempre(n.chave);
        continue;

      case TipoNoFluxo.MENSAGEM:
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'MENSAGEM',
          textos: textosDe(conteudo),
          proximo: destinoSempre(n.chave),
        };
        break;

      case TipoNoFluxo.ESCOLHA:
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'ESCOLHA',
          textos: textosDe(conteudo),
          opcoes: (conteudo.opcoes as OpcaoFluxo[] | undefined) ?? [],
          variavel: conteudo.variavel as string | undefined,
          valores: conteudo.valores as Record<string, string> | undefined,
          ramos: ramosDe(n.chave),
          proximo: destinoSempre(n.chave) || undefined,
        };
        break;

      case TipoNoFluxo.CONDICAO:
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'CONDICAO',
          ramos: ramosDe(n.chave),
          proximoPadrao: destinoSempre(n.chave) || undefined,
        };
        break;

      case TipoNoFluxo.ESPECIALIDADES: {
        const t = conteudo.tipo;
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'ESPECIALIDADES',
          textos: textosDe(conteudo),
          especialidadeTipo: t === 'CONSULTA' || t === 'EXAME' ? t : undefined,
          proximo: destinoSempre(n.chave),
        };
        break;
      }

      case TipoNoFluxo.PERGUNTA_TEXTO:
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'PERGUNTA_TEXTO',
          textos: textosDe(conteudo),
          campo: String(conteudo.campo ?? '') as CampoTexto,
          variavel: String(conteudo.variavel ?? ''),
          proximo: destinoSempre(n.chave),
        };
        break;

      case TipoNoFluxo.UPLOAD:
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'UPLOAD',
          textos: textosDe(conteudo),
          opcao: (conteudo.opcao as OpcaoFluxo | undefined) ?? {
            id: 'enviar',
            label: 'Enviar arquivo',
          },
          variavel: String(conteudo.variavel ?? ''),
          proximo: destinoSempre(n.chave),
        };
        break;

      case TipoNoFluxo.ACAO_CRIAR_SOLICITACAO:
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'ACAO_CRIAR_SOLICITACAO',
          proximo: destinoSempre(n.chave),
        };
        break;

      case TipoNoFluxo.FIM:
        nosFluxo[n.chave] = {
          id: n.chave,
          tipo: 'FIM',
          textos: textosDe(conteudo),
          opcoesFinais: conteudo.opcoesFinais as OpcaoFluxo[] | undefined,
        };
        break;
    }

    // (nós INICIO já fizeram `continue` acima; aqui tipo nunca é INICIO)
    if (n.ehInicial) inicialPorFlag = n.chave;
  }

  const inicial = inicialPorInicio || inicialPorFlag || nos[0]?.chave || '';

  return { chave, inicial, nos: nosFluxo };
}
