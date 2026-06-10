/**
 * Fonte única da verdade dos dados de seed. Consumida tanto pelo runtime
 * (`SeedService`, semeia automaticamente no boot quando o banco está vazio)
 * quanto pelos scripts de CLI (`prisma/seed.ts`, `prisma/seed-fluxo.ts`).
 *
 * Mantém apenas dados e helpers puros — sem acesso a banco — para que o mesmo
 * material seja reaproveitado sem duplicação.
 */
import dagre from '@dagrejs/dagre';
import {
  CanalFluxo,
  Prisma,
  PrismaClient,
  StatusFluxoVersao,
  TipoEspecialidade,
  TipoFluxo,
  TipoNoFluxo,
  TipoVariavelFluxo,
} from '@prisma/client';

// ----------------------------------------------------------- ESPECIALIDADES
export const ESPECIALIDADES = [
  { nome: 'Ginecologia', tipo: TipoEspecialidade.CONSULTA, ordem: 1 },
  { nome: 'Endocrinologia Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 2 },
  { nome: 'Dermatologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 3 },
  { nome: 'Dermatologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 4 },
  { nome: 'Neurologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 5 },
  { nome: 'Neurologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 6 },
  { nome: 'Psiquiatra Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 7 },
  { nome: 'Psiquiatra Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 8 },
  { nome: 'Cardiologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 9 },
  { nome: 'Cardiologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 10 },
  { nome: 'Ortopedista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 11 },
  { nome: 'Ortopedista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 12 },
  { nome: 'Cirurgião Geral Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 13 },
  { nome: 'Cirurgião Vascular', tipo: TipoEspecialidade.CONSULTA, ordem: 14 },
  { nome: 'Gastroenterologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 15 },
  { nome: 'Gastroenterologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 16 },
  { nome: 'Oftalmologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 17 },
  { nome: 'Oftalmologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 18 },
  { nome: 'Otorrinolaringologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 19 },
  { nome: 'Otorrinolaringologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 20 },
  { nome: 'Urologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 21 },
  { nome: 'Urologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 22 },
  { nome: 'Pediatria', tipo: TipoEspecialidade.CONSULTA, ordem: 23 },
  { nome: 'Eletroencefalograma', tipo: TipoEspecialidade.EXAME, ordem: 1 },
  { nome: 'Raio X', tipo: TipoEspecialidade.EXAME, ordem: 2 },
  { nome: 'Ultrassonografia', tipo: TipoEspecialidade.EXAME, ordem: 3 },
  { nome: 'Endoscopia Digestiva', tipo: TipoEspecialidade.EXAME, ordem: 4 },
];

// --------------------------------------------------------------------- FLUXO
export const NOME_FLUXO = 'Atendimento (Consulta + Exame)';

export type Opcao = { id: string; label: string; emoji?: string; destaque?: boolean };

export interface NoSeed {
  chave: string;
  tipo: TipoNoFluxo;
  conteudo: Record<string, unknown>;
  ehInicial?: boolean;
}

export interface ArestaSeed {
  de: string;
  para: string;
  condicao: Record<string, unknown>;
}

// --------------------------------------------------------------------- NÓS
export const NOS: NoSeed[] = [
  // Entrada do fluxo: nó INICIO explícito (mesma convenção do editor/CriarVersao).
  {
    chave: 'inicio',
    tipo: TipoNoFluxo.INICIO,
    ehInicial: true,
    conteudo: {},
  },
  {
    chave: 'boas-vindas',
    tipo: TipoNoFluxo.MENSAGEM,
    conteudo: {
      textos: [
        'Olá! 👋 Eu sou a Maria, a sua assistente da SEMUS de São José de Ribamar.',
        'Como posso te ajudar hoje?',
      ],
    },
  },
  {
    chave: 'menu',
    tipo: TipoNoFluxo.ESCOLHA,
    conteudo: {
      textos: [],
      variavel: 'tipoFluxo',
      valores: { 'agendar-consulta': 'consulta', 'agendar-exame': 'exame' },
      opcoes: [
        { id: 'agendar-consulta', label: 'Agendar Consulta', emoji: '🩺', destaque: true },
        { id: 'agendar-exame', label: 'Agendar Exame', emoji: '🧪', destaque: true },
        { id: 'cartao-sus', label: 'Consultar cartão do SUS', emoji: '🪪' },
        { id: 'vacinacao', label: 'Campanhas de vacinação', emoji: '💉' },
        { id: 'encerrar', label: 'Encerrar atendimento', emoji: '👋' },
      ] satisfies Opcao[],
    },
  },
  // Roteia a opção escolhida no menu (uma saída por botão).
  {
    chave: 'cond-menu',
    tipo: TipoNoFluxo.CONDICAO,
    conteudo: {},
  },
  {
    chave: 'info-cartao',
    tipo: TipoNoFluxo.MENSAGEM,
    conteudo: {
      textos: [
        'Para consultar o seu Cartão SUS, acesse o portal do Ministério da Saúde:\ngov.br/saude/cartaosus',
      ],
    },
  },
  {
    chave: 'info-vacinacao',
    tipo: TipoNoFluxo.MENSAGEM,
    conteudo: {
      textos: ['🚧 Essa funcionalidade ainda está sendo preparada com muito carinho. Em breve!'],
    },
  },
  {
    chave: 'voltar-menu',
    tipo: TipoNoFluxo.MENSAGEM,
    conteudo: { textos: ['Posso te ajudar com mais alguma coisa? 💚'] },
  },
  // Volta longa ao topo: REDIRECIONAR evita a seta cruzando todo o canvas.
  {
    chave: 'ir-menu',
    tipo: TipoNoFluxo.REDIRECIONAR,
    conteudo: { alvo: 'menu' },
  },
  {
    chave: 'esp-consulta',
    tipo: TipoNoFluxo.ESPECIALIDADES,
    conteudo: { textos: ['Qual especialidade você precisa consultar?'], tipo: 'CONSULTA' },
  },
  {
    chave: 'tipo-consulta',
    tipo: TipoNoFluxo.ESCOLHA,
    conteudo: {
      textos: [
        'Antes de continuar, me conta: é a **primeira vez** que vai consultar nessa especialidade ou é um **retorno**?',
      ],
      variavel: 'tipoConsulta',
      valores: { 'consulta-primeira': 'PRIMEIRA', 'consulta-retorno': 'RETORNO' },
      opcoes: [
        { id: 'consulta-primeira', label: 'É a primeira vez', emoji: '🆕', destaque: true },
        { id: 'consulta-retorno', label: 'É um retorno', emoji: '🔁' },
      ] satisfies Opcao[],
    },
  },
  {
    chave: 'esp-exame',
    tipo: TipoNoFluxo.ESPECIALIDADES,
    conteudo: { textos: ['Qual exame você precisa fazer?'], tipo: 'EXAME' },
  },
  {
    chave: 'para-quem',
    tipo: TipoNoFluxo.ESCOLHA,
    conteudo: {
      textos: ['Essa solicitação é pra você mesmo ou pra outra pessoa?'],
      variavel: 'paraQuem',
      valores: { 'para-eu': 'EU', 'para-outra': 'OUTRA' },
      opcoes: [
        { id: 'para-eu', label: 'É pra mim mesmo', emoji: '🙋', destaque: true },
        { id: 'para-outra', label: 'É pra outra pessoa', emoji: '👥' },
      ] satisfies Opcao[],
    },
  },
  // Roteia "pra mim" × "pra outra pessoa".
  {
    chave: 'cond-para-quem',
    tipo: TipoNoFluxo.CONDICAO,
    conteudo: {},
  },
  {
    chave: 'confirma-dados',
    tipo: TipoNoFluxo.ESCOLHA,
    conteudo: {
      textos: ['{{resumoPerfil}}', 'Posso seguir com esses dados?'],
      variavel: 'paraQuem',
      valores: { 'confirmar-dados-sim': 'EU', 'confirmar-dados-nao': 'OUTRA' },
      opcoes: [
        { id: 'confirmar-dados-sim', label: 'Sim, está tudo certo', emoji: '✅', destaque: true },
        { id: 'confirmar-dados-nao', label: 'Não, quero digitar de novo', emoji: '✏️' },
      ] satisfies Opcao[],
    },
  },
  // Roteia a confirmação dos dados do perfil.
  {
    chave: 'cond-confirma-dados',
    tipo: TipoNoFluxo.CONDICAO,
    conteudo: {},
  },
  // "Quero digitar de novo" reaproveita o ramo de coleta sem seta longa.
  {
    chave: 'ir-pedir-nome',
    tipo: TipoNoFluxo.REDIRECIONAR,
    conteudo: { alvo: 'pedir-nome' },
  },
  {
    chave: 'pedir-nome',
    tipo: TipoNoFluxo.PERGUNTA_TEXTO,
    conteudo: {
      textos: ['Beleza! Pode me informar o **nome completo** da pessoa?'],
      campo: 'nome',
      variavel: 'nome',
    },
  },
  {
    chave: 'agradece-nome',
    tipo: TipoNoFluxo.MENSAGEM,
    conteudo: { textos: ['Anotado, {{primeiroNome}}. 😊'] },
  },
  {
    chave: 'pedir-cpf',
    tipo: TipoNoFluxo.PERGUNTA_TEXTO,
    conteudo: {
      textos: ['Agora me passe o **CPF** dela (só os números).'],
      campo: 'cpf',
      variavel: 'cpf',
    },
  },
  {
    chave: 'pedir-endereco',
    tipo: TipoNoFluxo.PERGUNTA_TEXTO,
    conteudo: {
      textos: ['Agora informe o **endereço completo**: rua, número, bairro e cidade.'],
      campo: 'endereco',
      variavel: 'endereco',
    },
  },
  {
    chave: 'pedir-telefone',
    tipo: TipoNoFluxo.PERGUNTA_TEXTO,
    conteudo: {
      textos: ['Me passe o **telefone com DDD** dela, pra gente poder entrar em contato. 📱'],
      campo: 'telefone',
      variavel: 'telefone',
    },
  },
  {
    chave: 'upload',
    tipo: TipoNoFluxo.UPLOAD,
    conteudo: {
      textos: [
        '📸 Pra finalizar, envie uma foto do **encaminhamento médico**. Como prefere fazer?',
      ],
      opcao: { id: 'galeria', label: 'Enviar arquivo do computador', emoji: '🖼️', destaque: true },
      variavel: 'encaminhamentoUrl',
    },
  },
  {
    chave: 'criar',
    tipo: TipoNoFluxo.ACAO_CRIAR_SOLICITACAO,
    conteudo: {},
  },
  {
    chave: 'fim-sucesso',
    tipo: TipoNoFluxo.FIM,
    conteudo: {
      textos: [
        '✅ Pronto! Sua solicitação para **{{especialidadeNome}}** foi enviada para a CEMARC.\n\nNosso pessoal vai analisar e, em até 2 dias úteis, te avisamos a data e o horário aqui no site e no WhatsApp.',
        '📋 O número do seu protocolo é **{{protocolo}}**. Guarde com você!',
        '🔎 Você pode acompanhar todos os detalhes do seu pedido na aba **Solicitações** do menu. 💚',
      ],
      opcoesFinais: [
        { id: 'nova-solicitacao', label: 'Fazer nova solicitação', emoji: '🔄', destaque: true },
      ] satisfies Opcao[],
    },
  },
  {
    chave: 'fim-encerrar',
    tipo: TipoNoFluxo.FIM,
    conteudo: {
      textos: ['Foi um prazer falar com você! 💚 A prefeitura de São José de Ribamar agradece.'],
      opcoesFinais: [
        { id: 'nova-solicitacao', label: 'Fazer nova solicitação', emoji: '🔄', destaque: true },
      ] satisfies Opcao[],
    },
  },
];

// ------------------------------------------------------------------ ARESTAS
const sempre = (de: string, para: string): ArestaSeed => ({
  de,
  para,
  condicao: { tipo: 'sempre' },
});
const opcao = (de: string, para: string, valor: string): ArestaSeed => ({
  de,
  para,
  condicao: { tipo: 'opcao', valor },
});

// Ramificação por botão segue o padrão do editor: a ESCOLHA liga "sempre" na
// CONDICAO, e a CONDICAO tem uma aresta `opcao` por botão (valor = id do botão).
export const ARESTAS: ArestaSeed[] = [
  sempre('inicio', 'boas-vindas'),
  sempre('boas-vindas', 'menu'),
  sempre('menu', 'cond-menu'),
  opcao('cond-menu', 'esp-consulta', 'agendar-consulta'),
  opcao('cond-menu', 'esp-exame', 'agendar-exame'),
  opcao('cond-menu', 'info-cartao', 'cartao-sus'),
  opcao('cond-menu', 'info-vacinacao', 'vacinacao'),
  opcao('cond-menu', 'fim-encerrar', 'encerrar'),
  // Caminho normal (setas curtas): cada ramo informativo leva ao "voltar-menu".
  sempre('info-cartao', 'voltar-menu'),
  sempre('info-vacinacao', 'voltar-menu'),
  // Única volta longa ao topo → REDIRECIONAR (sem seta cruzando a tela).
  sempre('voltar-menu', 'ir-menu'),
  sempre('esp-consulta', 'tipo-consulta'),
  // Primeira vez ou retorno seguem pro mesmo destino → aresta "sempre" basta.
  sempre('tipo-consulta', 'para-quem'),
  sempre('esp-exame', 'para-quem'),
  sempre('para-quem', 'cond-para-quem'),
  opcao('cond-para-quem', 'confirma-dados', 'para-eu'),
  opcao('cond-para-quem', 'pedir-nome', 'para-outra'),
  sempre('confirma-dados', 'cond-confirma-dados'),
  opcao('cond-confirma-dados', 'upload', 'confirmar-dados-sim'),
  // Reaproveita a coleta de nome via redirecionamento (sem seta longa).
  opcao('cond-confirma-dados', 'ir-pedir-nome', 'confirmar-dados-nao'),
  sempre('pedir-nome', 'agradece-nome'),
  sempre('agradece-nome', 'pedir-cpf'),
  sempre('pedir-cpf', 'pedir-endereco'),
  sempre('pedir-endereco', 'pedir-telefone'),
  sempre('pedir-telefone', 'upload'),
  sempre('upload', 'criar'),
  sempre('criar', 'fim-sucesso'),
];

// ---------------------------------------------------------------- VARIÁVEIS
export const VARIAVEIS = [
  { chave: 'nome', rotulo: 'Nome completo', tipo: TipoVariavelFluxo.TEXTO, obrigatoria: true },
  { chave: 'cpf', rotulo: 'CPF', tipo: TipoVariavelFluxo.CPF, obrigatoria: true },
  { chave: 'endereco', rotulo: 'Endereço', tipo: TipoVariavelFluxo.TEXTO, obrigatoria: true },
  { chave: 'telefone', rotulo: 'Telefone', tipo: TipoVariavelFluxo.TELEFONE, obrigatoria: false },
  { chave: 'tipoFluxo', rotulo: 'Tipo de fluxo', tipo: TipoVariavelFluxo.OPCAO, obrigatoria: true },
  {
    chave: 'tipoConsulta',
    rotulo: 'Primeira vez ou retorno',
    tipo: TipoVariavelFluxo.OPCAO,
    obrigatoria: false,
  },
  {
    chave: 'paraQuem',
    rotulo: 'Para quem é a solicitação',
    tipo: TipoVariavelFluxo.OPCAO,
    obrigatoria: true,
  },
  {
    chave: 'especialidadeId',
    rotulo: 'Especialidade/Exame',
    tipo: TipoVariavelFluxo.OPCAO,
    obrigatoria: true,
  },
  {
    chave: 'encaminhamentoUrl',
    rotulo: 'Encaminhamento (foto)',
    tipo: TipoVariavelFluxo.ARQUIVO,
    obrigatoria: true,
  },
];

// ----------------------------------------------------------------- LAYOUT
/**
 * Layout hierárquico (top-down) com dagre — o MESMO algoritmo do botão
 * "Organizar" do editor. Posiciona os nós em camadas, centraliza pais sobre
 * filhos e minimiza cruzamentos, pra o fluxo abrir legível sem ajuste manual.
 */
export function calcularPosicoes(): Record<string, { x: number; y: number }> {
  const LARGURA = 288; // w-72 do card do nó
  const ALTURA = 130;

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 60, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of NOS) g.setNode(n.chave, { width: LARGURA, height: ALTURA });
  for (const a of ARESTAS) g.setEdge(a.de, a.para);

  dagre.layout(g);

  const posicoes: Record<string, { x: number; y: number }> = {};
  for (const n of NOS) {
    const no = g.node(n.chave);
    // dagre devolve o CENTRO; o React Flow usa o canto superior esquerdo.
    posicoes[n.chave] = {
      x: Math.round((no?.x ?? 0) - LARGURA / 2),
      y: Math.round((no?.y ?? 0) - ALTURA / 2),
    };
  }
  return posicoes;
}

// --------------------------------------------------------- SEMEADURA (boot+CLI)

/**
 * Revisão do desenho do fluxo. Faça bump ao alterar NOS/ARESTAS/VARIAVEIS: o
 * seed de boot só re-sobrescreve o RASCUNHO quando a revisão muda (não atropela
 * edição manual a cada restart). O CLI (`forcar: true`) sempre sobrescreve.
 */
export const SEED_FLUXO_REVISAO = '2026-06-10-remove-no-enviar-pdf';

const DESCRICAO_BASE = 'Fluxo seed do atendimento (consulta + exame).';
const marcarRevisao = (rev: string): string => `${DESCRICAO_BASE} [seed:${rev}]`;
const revisaoDe = (descricao: string | null): string | null => {
  const m = /\[seed:([^\]]+)\]/.exec(descricao ?? '');
  return m?.[1] ?? null;
};

/**
 * Grava (replace-total) o grafo Web/App e as variáveis do seed numa versão.
 * O canal WhatsApp não é semeado: quando vazio, reaproveita o desenho do
 * Web/App em runtime.
 */
async function gravarConteudoFluxo(tx: Prisma.TransactionClient, versaoId: string): Promise<void> {
  await tx.fluxoAresta.deleteMany({ where: { fluxoVersaoId: versaoId } });
  await tx.fluxoNo.deleteMany({ where: { fluxoVersaoId: versaoId } });
  await tx.fluxoVariavel.deleteMany({ where: { fluxoVersaoId: versaoId } });

  const posicoes = calcularPosicoes();

  const idPorChave = new Map<string, string>();
  for (const n of NOS) {
    const pos = posicoes[n.chave];
    const criado = await tx.fluxoNo.create({
      data: {
        fluxoVersaoId: versaoId,
        canal: CanalFluxo.WEB_APP,
        chave: n.chave,
        tipo: n.tipo,
        conteudo: n.conteudo as Prisma.InputJsonValue,
        posicaoX: pos.x,
        posicaoY: pos.y,
        ehInicial: n.ehInicial ?? false,
      },
    });
    idPorChave.set(n.chave, criado.id);
  }

  const ordemPorOrigem = new Map<string, number>();
  for (const a of ARESTAS) {
    const ordem = ordemPorOrigem.get(a.de) ?? 0;
    ordemPorOrigem.set(a.de, ordem + 1);
    await tx.fluxoAresta.create({
      data: {
        fluxoVersaoId: versaoId,
        canal: CanalFluxo.WEB_APP,
        noOrigemId: idPorChave.get(a.de)!,
        noDestinoId: idPorChave.get(a.para)!,
        condicao: a.condicao as Prisma.InputJsonValue,
        ordem,
      },
    });
  }

  for (const v of VARIAVEIS) {
    await tx.fluxoVariavel.create({
      data: {
        fluxoVersaoId: versaoId,
        chave: v.chave,
        rotulo: v.rotulo,
        tipo: v.tipo,
        obrigatoria: v.obrigatoria,
      },
    });
  }
}

export interface ResultadoSemeadura {
  acao: 'criado' | 'rascunho-sobrescrito' | 'sem-mudanca';
  status?: StatusFluxoVersao;
  numero?: number;
}

/**
 * Semeia/atualiza o fluxo de atendimento, idempotente e seguro p/ produção:
 * - fluxo inexistente → cria (v#1 PUBLICADA se nada publicado; senão RASCUNHO);
 * - fluxo existente → sobrescreve (replace-total) o RASCUNHO, criando um novo se
 *   não houver. NUNCA toca em versões PUBLICADA/ARQUIVADA.
 * - `forcar=false` (boot) respeita a trava de revisão; `true` (CLI) sempre grava.
 */
export async function semearFluxo(
  prisma: PrismaClient,
  opts: { forcar?: boolean } = {},
): Promise<ResultadoSemeadura> {
  const { forcar = false } = opts;
  const existente = await prisma.fluxoAtendimento.findFirst({ where: { nome: NOME_FLUXO } });

  if (!existente) {
    // Só pode existir UM fluxo publicado (índice único parcial global).
    const jaHaPublicada = await prisma.fluxoVersao.findFirst({
      where: { status: StatusFluxoVersao.PUBLICADA },
      select: { id: true },
    });
    const status = jaHaPublicada ? StatusFluxoVersao.RASCUNHO : StatusFluxoVersao.PUBLICADA;
    await prisma.$transaction(async (tx) => {
      const fluxo = await tx.fluxoAtendimento.create({
        data: {
          nome: NOME_FLUXO,
          tipo: TipoFluxo.OUTRO,
          descricao: marcarRevisao(SEED_FLUXO_REVISAO),
          ativo: true,
        },
      });
      const versao = await tx.fluxoVersao.create({
        data: {
          fluxoAtendimentoId: fluxo.id,
          numero: 1,
          status,
          publicadaEm: status === StatusFluxoVersao.PUBLICADA ? new Date() : null,
        },
      });
      await gravarConteudoFluxo(tx, versao.id);
    });
    return { acao: 'criado', status, numero: 1 };
  }

  // Trava de revisão (só no boot): já está nesta revisão → não mexe.
  if (!forcar && revisaoDe(existente.descricao) === SEED_FLUXO_REVISAO) {
    return { acao: 'sem-mudanca' };
  }

  let numero = 0;
  await prisma.$transaction(async (tx) => {
    const rascunhos = await tx.fluxoVersao.findMany({
      where: { fluxoAtendimentoId: existente.id, status: StatusFluxoVersao.RASCUNHO },
      orderBy: { numero: 'desc' },
    });
    let rascunho = rascunhos[0] ?? null;
    if (!rascunho) {
      const ultima = await tx.fluxoVersao.findFirst({
        where: { fluxoAtendimentoId: existente.id },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });
      rascunho = await tx.fluxoVersao.create({
        data: {
          fluxoAtendimentoId: existente.id,
          numero: (ultima?.numero ?? 0) + 1,
          status: StatusFluxoVersao.RASCUNHO,
        },
      });
    } else if (rascunhos.length > 1) {
      // Mantém UM rascunho do seed; remove duplicatas (ex.: corrida boot×CLI).
      await tx.fluxoVersao.deleteMany({
        where: { id: { in: rascunhos.slice(1).map((r) => r.id) } },
      });
    }
    numero = rascunho.numero;
    await gravarConteudoFluxo(tx, rascunho.id);
    await tx.fluxoAtendimento.update({
      where: { id: existente.id },
      data: { descricao: marcarRevisao(SEED_FLUXO_REVISAO) },
    });
  });
  return { acao: 'rascunho-sobrescrito', status: StatusFluxoVersao.RASCUNHO, numero };
}
