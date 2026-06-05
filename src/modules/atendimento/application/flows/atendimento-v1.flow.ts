import { Fluxo, Variaveis } from './tipos';

/**
 * Fluxo seed "atendimento-v1" — agendamento de consulta e exame.
 *
 * Replica o fluxo que hoje é hardcoded no front (site-maria-frontend), agora
 * conduzido pelo motor na API. Textos migrados de
 * `site-maria-frontend/src/services/chatbot/mensagens.ts`.
 *
 * Convenções de opcaoId tratadas ESPECIALMENTE pelo front (não chegam como
 * ação nesta conversa):
 *  - `galeria`         → abre o seletor de arquivo; depois envia ação `anexo`.
 *  - `nova-solicitacao`→ inicia uma NOVA conversa.
 */

export const FLUXO_ATENDIMENTO_V1 = 'atendimento-v1';

const primeiroNome = (v: Variaveis): string =>
  String(v.nome ?? '')
    .split(' ')
    .filter(Boolean)[0] ?? '';

const resumoPerfil = (v: Variaveis): string => {
  const p = (v._perfil ?? {}) as Record<string, string>;
  return (
    'Encontrei seus dados cadastrados. Confere se está tudo certo:\n\n' +
    `👤 ${p.nome ?? ''}\n` +
    `🪪 CPF: ${p.cpf ?? ''}\n` +
    `📱 ${p.telefone ?? ''}\n` +
    `🏠 ${p.endereco ?? ''}`
  );
};

export const fluxoAtendimentoV1: Fluxo = {
  chave: FLUXO_ATENDIMENTO_V1,
  inicial: 'inicio',
  nos: {
    // ---------------------------------------------------------------- MENU
    inicio: {
      id: 'inicio',
      tipo: 'MENSAGEM',
      textos: [
        'Olá! 👋 Eu sou a Maria, a sua assistente da SEMUS de São José de Ribamar.',
        'Como posso te ajudar hoje?',
      ],
      proximo: 'menu',
    },

    menu: {
      id: 'menu',
      tipo: 'ESCOLHA',
      variavel: 'tipoFluxo',
      valores: {
        'agendar-consulta': 'consulta',
        'agendar-exame': 'exame',
      },
      opcoes: [
        { id: 'agendar-consulta', label: 'Agendar Consulta', emoji: '🩺', destaque: true },
        { id: 'agendar-exame', label: 'Agendar Exame', emoji: '🧪', destaque: true },
        { id: 'cartao-sus', label: 'Consultar cartão do SUS', emoji: '🪪' },
        { id: 'vacinacao', label: 'Campanhas de vacinação', emoji: '💉' },
        { id: 'encerrar', label: 'Encerrar atendimento', emoji: '👋' },
      ],
      ramos: {
        'agendar-consulta': 'esp-consulta',
        'agendar-exame': 'esp-exame',
        'cartao-sus': 'info-cartao',
        vacinacao: 'info-vacinacao',
        encerrar: 'fim-encerrar',
      },
    },

    'info-cartao': {
      id: 'info-cartao',
      tipo: 'MENSAGEM',
      textos: [
        'Para consultar o seu Cartão SUS, acesse o portal do Ministério da Saúde:\ngov.br/saude/cartaosus',
      ],
      proximo: 'voltar-menu',
    },

    'info-vacinacao': {
      id: 'info-vacinacao',
      tipo: 'MENSAGEM',
      textos: ['🚧 Essa funcionalidade ainda está sendo preparada com muito carinho. Em breve!'],
      proximo: 'voltar-menu',
    },

    'voltar-menu': {
      id: 'voltar-menu',
      tipo: 'MENSAGEM',
      textos: ['Posso te ajudar com mais alguma coisa? 💚'],
      proximo: 'menu',
    },

    // ------------------------------------------------------------ CONSULTA
    'esp-consulta': {
      id: 'esp-consulta',
      tipo: 'ESPECIALIDADES',
      textos: ['Qual especialidade você precisa consultar?'],
      proximo: 'tipo-consulta',
    },

    'tipo-consulta': {
      id: 'tipo-consulta',
      tipo: 'ESCOLHA',
      textos: [
        'Antes de continuar, me conta: é a **primeira vez** que vai consultar nessa especialidade ou é um **retorno**?',
      ],
      variavel: 'tipoConsulta',
      valores: {
        'consulta-primeira': 'PRIMEIRA',
        'consulta-retorno': 'RETORNO',
      },
      opcoes: [
        { id: 'consulta-primeira', label: 'É a primeira vez', emoji: '🆕', destaque: true },
        { id: 'consulta-retorno', label: 'É um retorno', emoji: '🔁' },
      ],
      ramos: {
        'consulta-primeira': 'para-quem',
        'consulta-retorno': 'para-quem',
      },
    },

    // --------------------------------------------------------------- EXAME
    'esp-exame': {
      id: 'esp-exame',
      tipo: 'ESPECIALIDADES',
      textos: ['Qual exame você precisa fazer?'],
      proximo: 'para-quem',
    },

    // ----------------------------------------------- PRA QUEM (compartilhado)
    'para-quem': {
      id: 'para-quem',
      tipo: 'ESCOLHA',
      textos: ['Essa solicitação é pra você mesmo ou pra outra pessoa?'],
      variavel: 'paraQuem',
      valores: { 'para-eu': 'EU', 'para-outra': 'OUTRA' },
      opcoes: [
        { id: 'para-eu', label: 'É pra mim mesmo', emoji: '🙋', destaque: true },
        { id: 'para-outra', label: 'É pra outra pessoa', emoji: '👥' },
      ],
      ramos: {
        'para-eu': 'confirma-dados',
        'para-outra': 'pedir-nome',
      },
    },

    // -------------------------------------------------------- FLUXO "EU"
    'confirma-dados': {
      id: 'confirma-dados',
      tipo: 'ESCOLHA',
      textos: [resumoPerfil, 'Posso seguir com esses dados?'],
      variavel: 'paraQuem',
      valores: { 'confirmar-dados-sim': 'EU', 'confirmar-dados-nao': 'OUTRA' },
      opcoes: [
        { id: 'confirmar-dados-sim', label: 'Sim, está tudo certo', emoji: '✅', destaque: true },
        { id: 'confirmar-dados-nao', label: 'Não, quero digitar de novo', emoji: '✏️' },
      ],
      ramos: {
        'confirmar-dados-sim': 'upload',
        'confirmar-dados-nao': 'pedir-nome',
      },
    },

    // ----------------------------------------------------- FLUXO "OUTRA"
    'pedir-nome': {
      id: 'pedir-nome',
      tipo: 'PERGUNTA_TEXTO',
      textos: ['Beleza! Pode me informar o **nome completo** da pessoa?'],
      campo: 'nome',
      variavel: 'nome',
      proximo: 'agradece-nome',
    },

    'agradece-nome': {
      id: 'agradece-nome',
      tipo: 'MENSAGEM',
      textos: [(v) => `Anotado, ${primeiroNome(v)}. 😊`],
      proximo: 'pedir-cpf',
    },

    'pedir-cpf': {
      id: 'pedir-cpf',
      tipo: 'PERGUNTA_TEXTO',
      textos: ['Agora me passe o **CPF** dela (só os números).'],
      campo: 'cpf',
      variavel: 'cpf',
      proximo: 'pedir-endereco',
    },

    'pedir-endereco': {
      id: 'pedir-endereco',
      tipo: 'PERGUNTA_TEXTO',
      textos: ['Agora informe o **endereço completo**: rua, número, bairro e cidade.'],
      campo: 'endereco',
      variavel: 'endereco',
      proximo: 'pedir-telefone',
    },

    'pedir-telefone': {
      id: 'pedir-telefone',
      tipo: 'PERGUNTA_TEXTO',
      textos: ['Me passe o **telefone com DDD** dela, pra gente poder entrar em contato. 📱'],
      campo: 'telefone',
      variavel: 'telefone',
      proximo: 'upload',
    },

    // ------------------------------------------------- UPLOAD + CRIAÇÃO
    upload: {
      id: 'upload',
      tipo: 'UPLOAD',
      textos: [
        '📸 Pra finalizar, envie uma foto do **encaminhamento médico**. Como prefere fazer?',
      ],
      opcao: { id: 'galeria', label: 'Enviar arquivo do computador', emoji: '🖼️', destaque: true },
      variavel: 'encaminhamentoUrl',
      proximo: 'criar',
    },

    criar: {
      id: 'criar',
      tipo: 'ACAO_CRIAR_SOLICITACAO',
      proximo: 'fim-sucesso',
    },

    'fim-sucesso': {
      id: 'fim-sucesso',
      tipo: 'FIM',
      textos: [
        (v) =>
          `✅ Pronto! Sua solicitação para **${String(v._especialidadeNome ?? '')}** foi enviada para a CEMARC.\n\nNosso pessoal vai analisar e, em até 2 dias úteis, te avisamos a data e o horário aqui no site e no WhatsApp.`,
        (v) => `📋 O número do seu protocolo é **${String(v._protocolo ?? '')}**. Guarde com você!`,
        '🔎 Você pode acompanhar todos os detalhes do seu pedido na aba **Solicitações** do menu. 💚',
      ],
      opcoesFinais: [
        { id: 'nova-solicitacao', label: 'Fazer nova solicitação', emoji: '🔄', destaque: true },
      ],
    },

    'fim-encerrar': {
      id: 'fim-encerrar',
      tipo: 'FIM',
      textos: ['Foi um prazer falar com você! 💚 A prefeitura de São José de Ribamar agradece.'],
      opcoesFinais: [
        { id: 'nova-solicitacao', label: 'Fazer nova solicitação', emoji: '🔄', destaque: true },
      ],
    },
  },
};
