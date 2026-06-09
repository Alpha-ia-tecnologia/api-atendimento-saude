import {
  CanalFluxo,
  StatusFluxoVersao,
  TipoFluxo,
  TipoNoFluxo,
  TipoVariavelFluxo,
} from '@prisma/client';

export interface VersaoResumo {
  id: string;
  numero: number;
  status: StatusFluxoVersao;
  publicadaEm: string | null;
}

export interface FluxoResumo {
  id: string;
  nome: string;
  tipo: TipoFluxo;
  descricao: string | null;
  ativo: boolean;
  posicaoX: number | null;
  posicaoY: number | null;
  versoes: VersaoResumo[];
}

export interface NoDetalhe {
  chave: string;
  tipo: TipoNoFluxo;
  canal: CanalFluxo;
  conteudo: Record<string, unknown>;
  posicaoX: number;
  posicaoY: number;
  ehInicial: boolean;
}

export interface ArestaDetalhe {
  id: string;
  canal: CanalFluxo;
  origemChave: string;
  destinoChave: string;
  condicao: Record<string, unknown>;
  ordem: number;
}

export interface VariavelDetalhe {
  chave: string;
  rotulo: string;
  tipo: TipoVariavelFluxo;
  obrigatoria: boolean;
}

export interface FluxoVersaoDetalhe {
  fluxoId: string;
  fluxoNome: string;
  tipo: TipoFluxo;
  versao: VersaoResumo;
  nos: NoDetalhe[];
  arestas: ArestaDetalhe[];
  variaveis: VariavelDetalhe[];
}

/** Resultado da validação de um fluxo antes de publicar. */
export interface ResultadoValidacaoFluxo {
  valido: boolean;
  problemas: string[];
}
