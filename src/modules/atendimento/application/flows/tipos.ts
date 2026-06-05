/**
 * Tipos do fluxo de atendimento definido em CÓDIGO (Fase 0).
 *
 * O grafo é um objeto TypeScript tipado; o `FlowEngineService` interpreta.
 * Quando o CRM ganhar o editor, esses mesmos conceitos migram para as
 * tabelas Fluxo* versionadas — mas o contrato com o front (`ProximaAcao`)
 * permanece o mesmo.
 */

/** Variáveis coletadas ao longo da conversa (snapshot em `Conversa.variaveis`). */
export type Variaveis = Record<string, unknown>;

/** Campo de texto que o front deve renderizar (casa com o `ChatModo` do front). */
export type CampoTexto = 'nome' | 'cpf' | 'endereco' | 'telefone';

/** Opção apresentada ao usuário (botão). */
export interface OpcaoFluxo {
  id: string;
  label: string;
  emoji?: string;
  destaque?: boolean;
}

/** Texto fixo ou interpolado a partir das variáveis. */
export type Texto = string | ((v: Variaveis) => string);

/** O que o front deve renderizar depois das mensagens — espelha o ChatModo. */
export type ProximaAcao =
  | { tipo: 'opcoes'; opcoes: OpcaoFluxo[] }
  | { tipo: 'texto'; campo: CampoTexto }
  | { tipo: 'nenhum' };

interface NoBase {
  id: string;
}

/** Emite mensagem(ns) e avança automaticamente. */
export interface NoMensagem extends NoBase {
  tipo: 'MENSAGEM';
  textos: Texto[];
  proximo: string;
}

/** Apresenta opções estáticas; ramifica pela opção escolhida. */
export interface NoEscolha extends NoBase {
  tipo: 'ESCOLHA';
  textos?: Texto[];
  opcoes: OpcaoFluxo[];
  /** Variável onde salvar o valor da opção escolhida (opcional). */
  variavel?: string;
  /** opcaoId -> valor salvo na `variavel` (default: o próprio opcaoId). */
  valores?: Record<string, string>;
  /** opcaoId -> id do próximo nó (ramificação direta, estilo legado). */
  ramos: Record<string, string>;
  /** Saída única "sempre" (ex.: vai para um nó de Condição que ramifica). */
  proximo?: string;
}

/**
 * Nó de Condição (switch): roteia conforme o ÚLTIMO botão escolhido. Não pede
 * entrada — avança sozinho pelo ramo correspondente. Vem logo após um ESCOLHA.
 */
export interface NoCondicao extends NoBase {
  tipo: 'CONDICAO';
  /** opcaoId -> id do próximo nó. */
  ramos: Record<string, string>;
  /** Ramo padrão quando nenhum bate (opcional). */
  proximoPadrao?: string;
}

/** Apresenta opções DINÂMICAS de especialidade. */
export interface NoEspecialidades extends NoBase {
  tipo: 'ESPECIALIDADES';
  textos?: Texto[];
  /**
   * Filtra o catálogo por este tipo. Quando ausente, cai no comportamento
   * antigo: usa a variável `tipoFluxo` ('consulta'/'exame') definida no menu.
   */
  especialidadeTipo?: 'CONSULTA' | 'EXAME';
  proximo: string;
}

/** Pergunta e guarda resposta de texto (com validação por campo). */
export interface NoPerguntaTexto extends NoBase {
  tipo: 'PERGUNTA_TEXTO';
  textos: Texto[];
  campo: CampoTexto;
  variavel: string;
  proximo: string;
}

/** Pede um anexo (encaminhamento/requisição); aguarda ação `anexo`. */
export interface NoUpload extends NoBase {
  tipo: 'UPLOAD';
  textos: Texto[];
  /** Opção exibida pra disparar o seletor de arquivo no front. */
  opcao: OpcaoFluxo;
  variavel: string;
  proximo: string;
}

/** Efeito interno: cria a Solicitacao a partir das variáveis. Auto-avança. */
export interface NoAcaoCriarSolicitacao extends NoBase {
  tipo: 'ACAO_CRIAR_SOLICITACAO';
  proximo: string;
}

/** Encerra a conversa. Pode oferecer opções finais (ex.: nova solicitação). */
export interface NoFim extends NoBase {
  tipo: 'FIM';
  textos?: Texto[];
  opcoesFinais?: OpcaoFluxo[];
}

export type No =
  | NoMensagem
  | NoEscolha
  | NoCondicao
  | NoEspecialidades
  | NoPerguntaTexto
  | NoUpload
  | NoAcaoCriarSolicitacao
  | NoFim;

export interface Fluxo {
  chave: string;
  inicial: string;
  nos: Record<string, No>;
}
