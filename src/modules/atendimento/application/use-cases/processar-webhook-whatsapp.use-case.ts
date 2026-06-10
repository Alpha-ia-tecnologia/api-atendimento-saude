import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AutorMensagem,
  CanalConversa,
  Conversa,
  DirecaoMensagem,
  EstadoConversa,
  Prisma,
  TipoMensagem,
} from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import {
  MensagemEntrante,
  MESSAGING_PORT,
  MessagingPort,
} from '../../../whatsapp/domain/ports/messaging.port';
import {
  ESTADOS_ATIVOS,
  expirouPorInatividade,
  solicitacaoBloqueiaExpiracao,
} from '../conversa-inatividade';
import { FLUXO_ATENDIMENTO_V1 } from '../flows/atendimento-v1.flow';
import { Fluxo, OpcaoFluxo, Variaveis } from '../flows/tipos';
import { AcaoEntrada, FlowEngineService, ResultadoPasso } from '../services/flow-engine.service';
import { FluxoResolverService } from '../services/fluxo-resolver.service';

/**
 * Orquestra o canal WhatsApp sobre o MESMO FlowEngine do App/Web (doc 13):
 * webhook → normalização → idempotência → conversa por contato → motor →
 * respostas de volta pelo provedor.
 *
 * Conversa de WhatsApp é ANÔNIMA por decisão de produto: nunca criamos
 * `UsuarioMaria`; se o número já pertencer a um cadastro, apenas vinculamos.
 */
@Injectable()
export class ProcessarWebhookWhatsappUseCase {
  private readonly logger = new Logger(ProcessarWebhookWhatsappUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: FlowEngineService,
    private readonly resolver: FluxoResolverService,
    @Inject(MESSAGING_PORT) private readonly messaging: MessagingPort,
  ) {}

  /** Nunca lança: o provedor só precisa do HTTP 200 (reentrega se falhar). */
  async execute(payload: unknown): Promise<void> {
    let entrantes: MensagemEntrante[] = [];
    try {
      entrantes = await this.messaging.normalizarWebhook(payload);
    } catch (err) {
      this.logger.error(`Webhook não normalizado: ${(err as Error).message}`);
      return;
    }

    for (const msg of entrantes) {
      try {
        await this.processarMensagem(msg);
      } catch (err) {
        this.logger.error(
          `Falha ao processar mensagem ${msg.idExterno} de ${msg.contato}: ${(err as Error).message}`,
        );
      }
    }
  }

  // ---------------------------------------------------------------- privados

  private async processarMensagem(msg: MensagemEntrante): Promise<void> {
    // Idempotência: reentrega com idExterno já visto é ignorada. O idExterno
    // só é único POR PROVEDOR — incluímos o provedor pra não colidir entre eles.
    const jaProcessada = await this.prisma.mensagem.findFirst({
      where: {
        direcao: DirecaoMensagem.ENTRADA,
        AND: [
          { metadados: { path: ['idExterno'], equals: msg.idExterno } },
          { metadados: { path: ['provedor'], equals: msg.provedor } },
        ],
      },
      select: { id: true },
    });
    if (jaProcessada) return;

    const conversa = await this.prisma.conversa.findFirst({
      where: {
        canal: CanalConversa.WHATSAPP,
        contatoExterno: msg.contato,
        estado: { in: ESTADOS_ATIVOS },
      },
      orderBy: { ultimaInteracaoEm: 'desc' },
      include: { solicitacao: { select: { status: true } } },
    });

    // Parada há mais de 24h → expira e recomeça do zero (não retoma o fluxo),
    // salvo se a solicitação vinculada ainda está em curso (B5).
    if (
      conversa &&
      !solicitacaoBloqueiaExpiracao(conversa.canal, conversa.solicitacao?.status) &&
      expirouPorInatividade(conversa.estado, conversa.ultimaInteracaoEm)
    ) {
      await this.prisma.conversa.update({
        where: { id: conversa.id },
        data: { estado: EstadoConversa.EXPIRADA, encerradaEm: new Date() },
      });
      await this.iniciarConversa(msg);
      return;
    }

    if (!conversa) {
      await this.iniciarConversa(msg);
    } else {
      await this.continuarConversa(conversa, msg);
    }
  }

  /** Primeira mensagem do contato (ou pós-encerramento): nova conversa do zero. */
  private async iniciarConversa(msg: MensagemEntrante): Promise<void> {
    const usuario = await this.usuarioPeloTelefone(msg.contato);

    // Com cadastro vinculado, o ramo "É pra mim mesmo" funciona como no App.
    const variaveis: Variaveis = usuario
      ? {
          _perfil: {
            nome: usuario.nome,
            cpf: usuario.cpf,
            telefone: usuario.numeroWhatsapp,
            endereco: usuario.endereco ?? '',
          },
        }
      : {};

    const versao = await this.resolver.versaoPublicadaDoAtendimento();
    const fluxo = await this.resolver.resolverParaConversa(
      versao?.id ?? null,
      CanalConversa.WHATSAPP,
    );

    const passo = await this.engine.processar(
      {
        usuarioMariaId: usuario?.id ?? null,
        noAtual: null,
        variaveis,
        canal: CanalConversa.WHATSAPP,
        contatoExterno: msg.contato,
      },
      { tipo: 'iniciar' },
      fluxo,
    );

    const conversa = await this.prisma.conversa.create({
      data: {
        canal: CanalConversa.WHATSAPP,
        usuarioMariaId: usuario?.id ?? null,
        contatoExterno: msg.contato,
        // Fixa a instância que recebeu: respostas saem por ela por padrão.
        instanciaCanalId: msg.instanciaCanalId ?? null,
        fluxoChave: FLUXO_ATENDIMENTO_V1,
        fluxoVersaoId: versao?.id ?? null,
        noAtual: passo.noAtual,
        estado:
          passo.estado === 'ENCERRADA' ? EstadoConversa.ENCERRADA : EstadoConversa.EM_ANDAMENTO,
        variaveis: passo.variaveis as Prisma.InputJsonValue,
        mensagens: { create: [this.dadosEntrada(msg)] },
      },
      select: { id: true },
    });

    await this.entregarPasso(conversa.id, msg.contato, passo, msg.instanciaCanalId ?? null);
  }

  /** Mensagem numa conversa ativa: consome a entrada e avança o fluxo. */
  private async continuarConversa(conversa: Conversa, msg: MensagemEntrante): Promise<void> {
    const fluxo = await this.resolver.resolverParaConversa(
      conversa.fluxoVersaoId,
      CanalConversa.WHATSAPP,
    );
    const variaveis = (conversa.variaveis ?? {}) as Variaveis;
    const acao = await this.mapearAcao(conversa.noAtual, variaveis, msg, fluxo);

    let passo: ResultadoPasso;
    try {
      passo = await this.engine.processar(
        {
          usuarioMariaId: conversa.usuarioMariaId,
          noAtual: conversa.noAtual,
          variaveis,
          canal: CanalConversa.WHATSAPP,
          contatoExterno: msg.contato,
        },
        acao,
        fluxo,
      );
    } catch (err) {
      // Fluxo num beco sem saída (ex.: dados incompletos na criação): registra,
      // encerra e orienta a recomeçar — a próxima mensagem abre conversa nova.
      this.logger.error(`Fluxo interrompido na conversa ${conversa.id}: ${(err as Error).message}`);
      await this.prisma.$transaction([
        this.prisma.mensagem.create({
          data: { conversaId: conversa.id, ...this.dadosEntrada(msg) },
        }),
        this.prisma.conversa.update({
          where: { id: conversa.id },
          data: { estado: EstadoConversa.ENCERRADA, encerradaEm: new Date() },
        }),
      ]);
      await this.enviarESalvar(
        conversa.id,
        msg.contato,
        '😥 Não consegui concluir sua solicitação. Manda outra mensagem pra gente recomeçar do início, por favor.',
        null,
        conversa.instanciaCanalId,
      );
      return;
    }

    const encerrada = passo.estado === 'ENCERRADA';
    const solicitacaoId = passo.variaveis._solicitacaoId
      ? String(passo.variaveis._solicitacaoId)
      : null;

    await this.prisma.$transaction([
      this.prisma.mensagem.create({
        data: { conversaId: conversa.id, ...this.dadosEntrada(msg) },
      }),
      this.prisma.conversa.update({
        where: { id: conversa.id },
        data: {
          noAtual: passo.noAtual,
          estado: encerrada ? EstadoConversa.ENCERRADA : EstadoConversa.EM_ANDAMENTO,
          variaveis: passo.variaveis as Prisma.InputJsonValue,
          ...(solicitacaoId ? { solicitacaoId } : {}),
          ...(encerrada ? { encerradaEm: new Date() } : {}),
        },
      }),
    ]);

    await this.entregarPasso(conversa.id, msg.contato, passo, conversa.instanciaCanalId);
  }

  /**
   * Traduz a mensagem do WhatsApp na ação que o nó atual espera:
   * mídia → anexo; texto em nó de opções → número/rótulo da opção; senão texto.
   */
  private async mapearAcao(
    noAtual: string | null,
    variaveis: Variaveis,
    msg: MensagemEntrante,
    fluxo: Fluxo,
  ): Promise<AcaoEntrada> {
    if (msg.tipo !== 'texto') {
      // `anexoUrl` ausente (mídia não baixada) → o motor reenvia "não recebi".
      return { tipo: 'anexo', anexoUrl: msg.anexoUrl };
    }
    const texto = msg.texto ?? '';
    const acaoAtual = await this.engine.acaoAtual(noAtual, variaveis, fluxo);
    if (acaoAtual.tipo === 'opcoes') {
      const opcaoId = this.resolverOpcao(acaoAtual.opcoes, texto);
      // Sem correspondência: repassa o texto cru — o motor devolve o erro
      // amigável e mantém o nó (a lista é reapresentada).
      return { tipo: 'opcao', opcaoId: opcaoId ?? texto };
    }
    return { tipo: 'texto', texto };
  }

  /** Aceita o número da lista (1, 2, ...) ou o rótulo/id exato da opção. */
  private resolverOpcao(opcoes: OpcaoFluxo[], texto: string): string | null {
    const t = texto.trim().toLowerCase();
    const numero = Number(t.replace(/[.)]$/, ''));
    if (Number.isInteger(numero) && numero >= 1 && numero <= opcoes.length) {
      return opcoes[numero - 1].id;
    }
    const porTexto = opcoes.find(
      (o) => o.label.trim().toLowerCase() === t || o.id.toLowerCase() === t,
    );
    return porTexto?.id ?? null;
  }

  /** Envia as falas do passo pela instância da conversa e registra cada uma. */
  private async entregarPasso(
    conversaId: string,
    contato: string,
    passo: ResultadoPasso,
    instanciaCanalId: string | null,
  ): Promise<void> {
    for (const texto of this.renderizarPasso(passo)) {
      await this.enviarESalvar(conversaId, contato, texto, passo.noAtual, instanciaCanalId);
    }
  }

  /**
   * No WhatsApp não há botões: nós de opções viram lista numerada; o nó de
   * UPLOAD vira instrução de mandar a foto; opções de pós-encerramento
   * (ex.: "nova solicitação") são omitidas — basta mandar outra mensagem.
   */
  private renderizarPasso(passo: ResultadoPasso): string[] {
    const textos = passo.mensagens.map((m) => m.texto);
    if (passo.proximaAcao.tipo !== 'opcoes') return textos;

    const opcoes = passo.proximaAcao.opcoes.filter((o) => o.id !== 'nova-solicitacao');
    if (opcoes.length === 0) return textos;

    if (opcoes.length === 1 && opcoes[0].id === 'galeria') {
      textos.push('Pode enviar a foto aqui mesmo pelo WhatsApp. 📎');
      return textos;
    }

    const lista = opcoes
      .map((o, i) => `*${i + 1}.* ${o.emoji ? `${o.emoji} ` : ''}${o.label}`)
      .join('\n');
    textos.push(`Responda com o *número* de uma das opções:\n\n${lista}`);
    return textos;
  }

  private async enviarESalvar(
    conversaId: string,
    contato: string,
    texto: string,
    noFluxo: string | null,
    instanciaCanalId: string | null,
  ): Promise<void> {
    let metadados: Record<string, unknown>;
    try {
      const { idExterno } = await this.messaging.enviarTexto({ contato, texto }, instanciaCanalId);
      metadados = { idExterno };
    } catch (err) {
      this.logger.error(`Envio ao WhatsApp falhou: ${(err as Error).message}`);
      metadados = { erroEnvio: (err as Error).message };
    }
    await this.prisma.mensagem.create({
      data: {
        conversaId,
        direcao: DirecaoMensagem.SAIDA,
        autor: AutorMensagem.BOT,
        conteudo: texto,
        noFluxo,
        metadados: metadados as Prisma.InputJsonValue,
      },
    });
  }

  /** Dados da Mensagem de ENTRADA (o que o solicitante mandou). */
  private dadosEntrada(msg: MensagemEntrante) {
    const tipo =
      msg.tipo === 'imagem'
        ? TipoMensagem.IMAGEM
        : msg.tipo === 'documento'
          ? TipoMensagem.DOCUMENTO
          : TipoMensagem.TEXTO;
    return {
      direcao: DirecaoMensagem.ENTRADA,
      autor: AutorMensagem.SOLICITANTE,
      tipo,
      conteudo: msg.texto ?? (msg.tipo === 'texto' ? '' : '📎 Anexo enviado'),
      anexoUrl: msg.anexoUrl ?? null,
      metadados: {
        idExterno: msg.idExterno,
        provedor: msg.provedor,
      } as Prisma.InputJsonValue,
    };
  }

  /**
   * Vincula um cadastro existente pelo telefone — comparação por dígitos,
   * tolerante a máscara e ao DDI 55 (com/sem o nono dígito).
   */
  private async usuarioPeloTelefone(contato: string) {
    const candidatos = this.variantesTelefone(contato);
    if (candidatos.length === 0) return null;
    const rows = await this.prisma.$queryRaw<
      { id: string; nome: string; cpf: string; numero_whatsapp: string; endereco: string | null }[]
    >`
      SELECT id, nome, cpf, numero_whatsapp, endereco
        FROM usuarios_maria
       WHERE ativo = true
         AND regexp_replace(numero_whatsapp, '\\D', '', 'g') = ANY(${candidatos})
       LIMIT 1
    `;
    const u = rows[0];
    return u
      ? {
          id: u.id,
          nome: u.nome,
          cpf: u.cpf,
          numeroWhatsapp: u.numero_whatsapp,
          endereco: u.endereco,
        }
      : null;
  }

  /** Variações BR do número: com/sem DDI 55 e com/sem o nono dígito. */
  private variantesTelefone(contato: string): string[] {
    const d = contato.replace(/\D/g, '');
    if (d.length < 10) return [];
    const semDdi = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
    const variantes = new Set<string>([d, semDdi, `55${semDdi}`]);
    // 55 + DDD + 8 dígitos (sem o 9): inclui a forma com 9 e vice-versa.
    if (semDdi.length === 10) {
      const com9 = `${semDdi.slice(0, 2)}9${semDdi.slice(2)}`;
      variantes.add(com9).add(`55${com9}`);
    } else if (semDdi.length === 11 && semDdi[2] === '9') {
      const sem9 = `${semDdi.slice(0, 2)}${semDdi.slice(3)}`;
      variantes.add(sem9).add(`55${sem9}`);
    }
    return [...variantes];
  }
}
