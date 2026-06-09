import { Injectable } from '@nestjs/common';
import { CanalFluxo, TipoNoFluxo } from '@prisma/client';

import { ResultadoValidacaoFluxo } from '../fluxo.types';

interface NoValidacao {
  chave: string;
  tipo: TipoNoFluxo;
  ehInicial: boolean;
  conteudo: Record<string, unknown>;
  canal: CanalFluxo;
}
interface ArestaValidacao {
  origemChave: string;
  destinoChave: string;
  canal: CanalFluxo;
}

const ROTULO_CANAL: Record<CanalFluxo, string> = {
  WEB_APP: 'Web/App',
  WHATSAPP: 'WhatsApp',
};

/**
 * Valida a consistência de um fluxo antes de publicar. Cada canal (Web/App e
 * WhatsApp) é um grafo independente e é validado separadamente; só entram na
 * validação os canais que têm nós. Por grafo:
 * - exatamente um nó inicial;
 * - nenhum nó órfão (todos alcançáveis a partir do inicial);
 * - todo nó alcança um FIM;
 * - arestas referenciam nós existentes;
 * - variáveis usadas (campo `variavel` dos nós) estão declaradas.
 */
@Injectable()
export class ValidarFluxoUseCase {
  execute(
    nosTodos: NoValidacao[],
    arestasTodas: ArestaValidacao[],
    variaveisDeclaradas: string[],
  ): ResultadoValidacaoFluxo {
    if (nosTodos.length === 0) {
      return { valido: false, problemas: ['O fluxo não tem nenhum nó.'] };
    }
    const canais = [...new Set(nosTodos.map((n) => n.canal))];
    const problemas: string[] = [];
    for (const canal of canais) {
      const nos = nosTodos.filter((n) => n.canal === canal);
      const arestas = arestasTodas.filter((a) => a.canal === canal);
      problemas.push(
        ...this.validarGrafo(nos, arestas, variaveisDeclaradas).map(
          (p) => `[${ROTULO_CANAL[canal]}] ${p}`,
        ),
      );
    }
    return { valido: problemas.length === 0, problemas };
  }

  /** Valida UM subgrafo (um canal). Devolve a lista de problemas (sem prefixo). */
  private validarGrafo(
    nos: NoValidacao[],
    arestas: ArestaValidacao[],
    variaveisDeclaradas: string[],
  ): string[] {
    const problemas: string[] = [];
    const chaves = new Set(nos.map((n) => n.chave));

    // 1) Exatamente um nó inicial (bloco INICIO ou nó marcado como inicial).
    const iniciais = nos.filter((n) => n.tipo === TipoNoFluxo.INICIO || n.ehInicial);
    if (iniciais.length === 0) problemas.push('Nenhum nó inicial definido.');
    if (iniciais.length > 1) {
      problemas.push(
        `Há ${iniciais.length} nós iniciais (${iniciais.map((n) => n.chave).join(', ')}); deve haver exatamente um.`,
      );
    }

    // 2) Arestas referenciam nós existentes.
    for (const a of arestas) {
      if (!chaves.has(a.origemChave)) {
        problemas.push(`Aresta com origem inexistente: "${a.origemChave}".`);
      }
      if (!chaves.has(a.destinoChave)) {
        problemas.push(`Aresta com destino inexistente: "${a.destinoChave}".`);
      }
    }

    // Adjacência (direta e reversa) só com arestas válidas.
    const adj = new Map<string, string[]>();
    const adjRev = new Map<string, string[]>();
    const ligar = (mapa: Map<string, string[]>, de: string, para: string) => {
      const lista = mapa.get(de) ?? [];
      lista.push(para);
      mapa.set(de, lista);
    };
    for (const a of arestas) {
      if (!chaves.has(a.origemChave) || !chaves.has(a.destinoChave)) continue;
      ligar(adj, a.origemChave, a.destinoChave);
      ligar(adjRev, a.destinoChave, a.origemChave);
    }

    // Nós REDIRECIONAR encaminham pro `conteudo.alvo` por referência (sem
    // aresta) — viram arestas virtuais p/ alcançabilidade e "alcança FIM".
    for (const n of nos) {
      if (n.tipo !== TipoNoFluxo.REDIRECIONAR) continue;
      const alvo = typeof n.conteudo?.alvo === 'string' ? n.conteudo.alvo : '';
      if (!alvo || !chaves.has(alvo)) {
        problemas.push(
          `Nó de redirecionamento "${n.chave}" aponta para um destino inexistente${alvo ? ` ("${alvo}")` : ''}.`,
        );
        continue;
      }
      ligar(adj, n.chave, alvo);
      ligar(adjRev, alvo, n.chave);
    }

    // 3) Nós órfãos (inalcançáveis a partir do inicial).
    if (iniciais.length === 1) {
      const alcancaveis = bfs(iniciais[0].chave, adj);
      const orfaos = nos.filter((n) => !alcancaveis.has(n.chave));
      if (orfaos.length > 0) {
        problemas.push(
          `Nó(s) inalcançável(is) a partir do início: ${orfaos.map((n) => n.chave).join(', ')}.`,
        );
      }
    }

    // 4) Todo nó deve alcançar um FIM.
    const fins = nos.filter((n) => n.tipo === TipoNoFluxo.FIM).map((n) => n.chave);
    if (fins.length === 0) {
      problemas.push('O fluxo não tem nenhum nó FIM.');
    } else {
      const alcancamFim = new Set<string>();
      const fila = [...fins];
      fins.forEach((f) => alcancamFim.add(f));
      while (fila.length > 0) {
        const atual = fila.shift()!;
        for (const anterior of adjRev.get(atual) ?? []) {
          if (!alcancamFim.has(anterior)) {
            alcancamFim.add(anterior);
            fila.push(anterior);
          }
        }
      }
      const semFim = nos.filter((n) => !alcancamFim.has(n.chave));
      if (semFim.length > 0) {
        problemas.push(`Nó(s) que não levam a um FIM: ${semFim.map((n) => n.chave).join(', ')}.`);
      }
    }

    // 5) Variáveis usadas (campo `variavel`) precisam estar declaradas.
    const declaradas = new Set(variaveisDeclaradas);
    for (const n of nos) {
      const v = n.conteudo?.variavel;
      if (typeof v === 'string' && v && !declaradas.has(v)) {
        problemas.push(`Nó "${n.chave}" usa a variável "${v}" que não foi declarada.`);
      }
    }

    return problemas;
  }
}

function bfs(inicio: string, adj: Map<string, string[]>): Set<string> {
  const visitados = new Set<string>([inicio]);
  const fila = [inicio];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const destino of adj.get(atual) ?? []) {
      if (!visitados.has(destino)) {
        visitados.add(destino);
        fila.push(destino);
      }
    }
  }
  return visitados;
}
