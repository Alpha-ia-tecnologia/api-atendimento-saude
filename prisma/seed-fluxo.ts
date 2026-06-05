/**
 * Seed idempotente do fluxo "Atendimento (Consulta + Exame)" — transcreve o
 * fluxo hardcoded `fluxoAtendimentoV1` para as tabelas Fluxo* versionadas como
 * FluxoVersao #1. Os textos que eram funções no código viram templates
 * `{{var}}` (interpolados pelo motor na fatia de cut-over).
 *
 * Segue o padrão atual do editor: nó INICIO explícito como entrada (não mais
 * `ehInicial` num MENSAGEM) e ramificação por botão via nós CONDICAO — a
 * ESCOLHA liga "sempre" na CONDICAO, que tem uma saída por opção.
 *
 * Rodar: `npm run seed:fluxo` (DATABASE_URL inline aponta o banco).
 * Idempotente: se já existir um FluxoAtendimento com o NOME abaixo, não faz nada.
 */
import {
  PrismaClient,
  StatusFluxoVersao,
  TipoFluxo,
  TipoNoFluxo,
  TipoVariavelFluxo,
} from '@prisma/client';

const prisma = new PrismaClient();

const NOME_FLUXO = 'Atendimento (Consulta + Exame)';

type Opcao = { id: string; label: string; emoji?: string; destaque?: boolean };

interface NoSeed {
  chave: string;
  tipo: TipoNoFluxo;
  conteudo: Record<string, unknown>;
  ehInicial?: boolean;
}

interface ArestaSeed {
  de: string;
  para: string;
  condicao: Record<string, unknown>;
}

// --------------------------------------------------------------------- NÓS
const NOS: NoSeed[] = [
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
const ARESTAS: ArestaSeed[] = [
  sempre('inicio', 'boas-vindas'),
  sempre('boas-vindas', 'menu'),
  sempre('menu', 'cond-menu'),
  opcao('cond-menu', 'esp-consulta', 'agendar-consulta'),
  opcao('cond-menu', 'esp-exame', 'agendar-exame'),
  opcao('cond-menu', 'info-cartao', 'cartao-sus'),
  opcao('cond-menu', 'info-vacinacao', 'vacinacao'),
  opcao('cond-menu', 'fim-encerrar', 'encerrar'),
  sempre('info-cartao', 'voltar-menu'),
  sempre('info-vacinacao', 'voltar-menu'),
  sempre('voltar-menu', 'menu'),
  sempre('esp-consulta', 'tipo-consulta'),
  // Primeira vez ou retorno seguem pro mesmo destino → aresta "sempre" basta.
  sempre('tipo-consulta', 'para-quem'),
  sempre('esp-exame', 'para-quem'),
  sempre('para-quem', 'cond-para-quem'),
  opcao('cond-para-quem', 'confirma-dados', 'para-eu'),
  opcao('cond-para-quem', 'pedir-nome', 'para-outra'),
  sempre('confirma-dados', 'cond-confirma-dados'),
  opcao('cond-confirma-dados', 'upload', 'confirmar-dados-sim'),
  opcao('cond-confirma-dados', 'pedir-nome', 'confirmar-dados-nao'),
  sempre('pedir-nome', 'agradece-nome'),
  sempre('agradece-nome', 'pedir-cpf'),
  sempre('pedir-cpf', 'pedir-endereco'),
  sempre('pedir-endereco', 'pedir-telefone'),
  sempre('pedir-telefone', 'upload'),
  sempre('upload', 'criar'),
  sempre('criar', 'fim-sucesso'),
];

// ---------------------------------------------------------------- VARIÁVEIS
const VARIAVEIS = [
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
/** Layout em camadas: profundidade (BFS a partir do inicial) → y; ordem → x. */
function calcularPosicoes(): Record<string, { x: number; y: number }> {
  const adjacencia = new Map<string, string[]>();
  for (const a of ARESTAS) {
    const lista = adjacencia.get(a.de) ?? [];
    lista.push(a.para);
    adjacencia.set(a.de, lista);
  }
  const profundidade = new Map<string, number>();
  const fila: string[] = ['inicio'];
  profundidade.set('inicio', 0);
  while (fila.length > 0) {
    const atual = fila.shift()!;
    const d = profundidade.get(atual)!;
    for (const destino of adjacencia.get(atual) ?? []) {
      if (!profundidade.has(destino)) {
        profundidade.set(destino, d + 1);
        fila.push(destino);
      }
    }
  }
  // Nós não alcançados (nenhum esperado) caem na última camada.
  let maxD = 0;
  for (const d of profundidade.values()) maxD = Math.max(maxD, d);
  for (const n of NOS) if (!profundidade.has(n.chave)) profundidade.set(n.chave, maxD + 1);

  const indicePorCamada = new Map<number, number>();
  const posicoes: Record<string, { x: number; y: number }> = {};
  for (const n of NOS) {
    const d = profundidade.get(n.chave)!;
    const i = indicePorCamada.get(d) ?? 0;
    indicePorCamada.set(d, i + 1);
    posicoes[n.chave] = { x: i * 280, y: d * 150 };
  }
  return posicoes;
}

async function main() {
  const existente = await prisma.fluxoAtendimento.findFirst({
    where: { nome: NOME_FLUXO },
  });
  if (existente) {
    console.log(`Fluxo "${NOME_FLUXO}" já existe (${existente.id}). Nada a fazer.`);
    return;
  }

  const posicoes = calcularPosicoes();

  // Só pode existir UM fluxo publicado no sistema (índice único parcial).
  // Se outro fluxo já está publicado, semeia a versão como RASCUNHO.
  const jaHaPublicada = await prisma.fluxoVersao.findFirst({
    where: { status: StatusFluxoVersao.PUBLICADA },
    select: { id: true },
  });
  const statusInicial = jaHaPublicada ? StatusFluxoVersao.RASCUNHO : StatusFluxoVersao.PUBLICADA;

  await prisma.$transaction(async (tx) => {
    const fluxo = await tx.fluxoAtendimento.create({
      data: {
        nome: NOME_FLUXO,
        tipo: TipoFluxo.OUTRO,
        descricao: 'Fluxo seed migrado do atendimento-v1 (consulta + exame).',
        ativo: true,
      },
    });

    const versao = await tx.fluxoVersao.create({
      data: {
        fluxoAtendimentoId: fluxo.id,
        numero: 1,
        status: statusInicial,
        publicadaEm: statusInicial === StatusFluxoVersao.PUBLICADA ? new Date() : null,
      },
    });

    // Nós (captura id por chave para ligar as arestas).
    const idPorChave = new Map<string, string>();
    for (const n of NOS) {
      const pos = posicoes[n.chave];
      const criado = await tx.fluxoNo.create({
        data: {
          fluxoVersaoId: versao.id,
          chave: n.chave,
          tipo: n.tipo,
          conteudo: n.conteudo as object,
          posicaoX: pos.x,
          posicaoY: pos.y,
          ehInicial: n.ehInicial ?? false,
        },
      });
      idPorChave.set(n.chave, criado.id);
    }

    // Arestas (ordem por origem para condições determinísticas).
    const ordemPorOrigem = new Map<string, number>();
    for (const a of ARESTAS) {
      const ordem = ordemPorOrigem.get(a.de) ?? 0;
      ordemPorOrigem.set(a.de, ordem + 1);
      await tx.fluxoAresta.create({
        data: {
          fluxoVersaoId: versao.id,
          noOrigemId: idPorChave.get(a.de)!,
          noDestinoId: idPorChave.get(a.para)!,
          condicao: a.condicao as object,
          ordem,
        },
      });
    }

    // Variáveis.
    for (const v of VARIAVEIS) {
      await tx.fluxoVariavel.create({
        data: {
          fluxoVersaoId: versao.id,
          chave: v.chave,
          rotulo: v.rotulo,
          tipo: v.tipo,
          obrigatoria: v.obrigatoria,
        },
      });
    }

    console.log(
      `Fluxo semeado: ${fluxo.id} · versão #1 ${statusInicial} · ` +
        `${NOS.length} nós · ${ARESTAS.length} arestas · ${VARIAVEIS.length} variáveis.`,
    );
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
