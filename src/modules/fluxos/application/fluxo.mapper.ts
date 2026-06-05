import { FluxoAtendimento, FluxoAresta, FluxoNo, FluxoVariavel, FluxoVersao } from '@prisma/client';

import { FluxoResumo, FluxoVersaoDetalhe, VersaoResumo } from './fluxo.types';

export function mapVersaoResumo(v: FluxoVersao): VersaoResumo {
  return {
    id: v.id,
    numero: v.numero,
    status: v.status,
    publicadaEm: v.publicadaEm ? v.publicadaEm.toISOString() : null,
  };
}

export function mapFluxoResumo(fluxo: FluxoAtendimento & { versoes: FluxoVersao[] }): FluxoResumo {
  return {
    id: fluxo.id,
    nome: fluxo.nome,
    tipo: fluxo.tipo,
    descricao: fluxo.descricao,
    ativo: fluxo.ativo,
    posicaoX: fluxo.posicaoX,
    posicaoY: fluxo.posicaoY,
    versoes: [...fluxo.versoes].sort((a, b) => b.numero - a.numero).map(mapVersaoResumo),
  };
}

export function mapVersaoDetalhe(
  fluxo: FluxoAtendimento,
  versao: FluxoVersao & {
    nos: FluxoNo[];
    arestas: FluxoAresta[];
    variaveis: FluxoVariavel[];
  },
): FluxoVersaoDetalhe {
  // id do nó → chave (arestas são expostas por chave, não por uuid).
  const chavePorId = new Map(versao.nos.map((n) => [n.id, n.chave]));

  return {
    fluxoId: fluxo.id,
    fluxoNome: fluxo.nome,
    tipo: fluxo.tipo,
    versao: mapVersaoResumo(versao),
    nos: versao.nos.map((n) => ({
      chave: n.chave,
      tipo: n.tipo,
      conteudo: (n.conteudo ?? {}) as Record<string, unknown>,
      posicaoX: n.posicaoX,
      posicaoY: n.posicaoY,
      ehInicial: n.ehInicial,
    })),
    arestas: versao.arestas.map((a) => ({
      id: a.id,
      origemChave: chavePorId.get(a.noOrigemId) ?? '',
      destinoChave: chavePorId.get(a.noDestinoId) ?? '',
      condicao: (a.condicao ?? {}) as Record<string, unknown>,
      ordem: a.ordem,
    })),
    variaveis: versao.variaveis.map((v) => ({
      chave: v.chave,
      rotulo: v.rotulo,
      tipo: v.tipo,
      obrigatoria: v.obrigatoria,
    })),
  };
}
