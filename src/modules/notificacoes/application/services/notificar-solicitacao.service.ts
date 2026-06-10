import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AutorMensagem,
  CanalConversa,
  CanalNotificacao,
  DirecaoMensagem,
  OrigemSolicitacao,
  StatusNotificacao,
  TipoMensagem,
  TipoNotificacao,
} from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { MinioService } from '../../../files/application/services/minio.service';
import { MESSAGING_PORT, MessagingPort } from '../../../whatsapp/domain/ports/messaging.port';
import { ExpoPushService } from './expo-push.service';

/** Recorte da Solicitacao com o necessário pra notificar. */
export interface SolicitacaoNotificavel {
  id: string;
  protocolo: string;
  solicitanteId: string | null;
  pacienteNome: string;
  pacienteTelefoneWhatsapp: string | null;
  origem: OrigemSolicitacao;
  dataAgendada?: Date | null;
  motivoNaoAprovacao?: string | null;
  especialidade?: { nome: string } | null;
}

/**
 * H4.3/H6.3 — Notifica o solicitante sobre o ciclo de vida da solicitação:
 * - Linha `PUSH` = inbox in-app (App/Web), só pra quem tem cadastro.
 * - Linha `WHATSAPP` = texto real via MessagingPort, quando há telefone.
 * NUNCA lança: falha de notificação não pode desfazer a operação do gestor.
 */
@Injectable()
export class NotificarSolicitacaoService {
  private readonly logger = new Logger(NotificarSolicitacaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_PORT) private readonly messaging: MessagingPort,
    private readonly expoPush: ExpoPushService,
    private readonly minio: MinioService,
  ) {}

  async solicitacaoCriada(s: SolicitacaoNotificavel): Promise<void> {
    // Quem pediu pelo WhatsApp já recebeu o protocolo na própria conversa —
    // criar a notificação in-app basta (se houver cadastro).
    await this.registrar(s, TipoNotificacao.SOLICITACAO_CRIADA, {
      titulo: 'Solicitação enviada',
      corpo:
        `Recebemos sua solicitação de ${this.servico(s)}. ` +
        `Protocolo ${s.protocolo}. Em até 2 dias úteis você recebe a resposta.`,
      enviarWhatsapp: false,
    });
  }

  async solicitacaoAgendada(s: SolicitacaoNotificavel): Promise<void> {
    const quando = s.dataAgendada
      ? ` para ${s.dataAgendada.toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        })}`
      : '';
    await this.registrar(s, TipoNotificacao.SOLICITACAO_AGENDADA, {
      titulo: 'Agendamento confirmado! ✅',
      corpo:
        `Boa notícia, ${this.primeiroNome(s)}! Sua solicitação de ${this.servico(s)} ` +
        `(protocolo ${s.protocolo}) foi AGENDADA${quando}. ` +
        `O comprovante está disponível na aba Solicitações.`,
      enviarWhatsapp: true,
    });
  }

  async solicitacaoRecusada(s: SolicitacaoNotificavel): Promise<void> {
    const motivo = s.motivoNaoAprovacao ? ` Motivo: ${s.motivoNaoAprovacao}` : '';
    await this.registrar(s, TipoNotificacao.SOLICITACAO_NAO_APROVADA, {
      titulo: 'Solicitação não aprovada',
      corpo:
        `${this.primeiroNome(s)}, sua solicitação de ${this.servico(s)} ` +
        `(protocolo ${s.protocolo}) não foi aprovada.${motivo}`,
      enviarWhatsapp: true,
    });
  }

  /**
   * B3 — Envia o comprovante (PDF) pela conversa de WhatsApp vinculada à
   * solicitação, disparado na aprovação. A mensagem é fixa.
   * NUNCA lança: o envio é melhor-esforço e não pode desfazer a aprovação.
   */
  async enviarPdfAgendamento(solicitacaoId: string): Promise<void> {
    const MENSAGEM = 'Seu agendamento foi concluído! ✅ Segue o comprovante em anexo.';
    try {
      const conversa = await this.prisma.conversa.findUnique({
        where: { solicitacaoId },
        select: {
          id: true,
          canal: true,
          contatoExterno: true,
          instanciaCanalId: true,
        },
      });
      // Sem conversa de WhatsApp com contato: nada a enviar.
      if (!conversa || conversa.canal !== CanalConversa.WHATSAPP || !conversa.contatoExterno) {
        return;
      }

      const solicitacao = await this.prisma.solicitacao.findUnique({
        where: { id: solicitacaoId },
        select: { agendamentoPdfUrl: true },
      });
      const pdfUrl = solicitacao?.agendamentoPdfUrl;
      if (!pdfUrl) return;

      // O provedor (Evolution/Meta) baixa o arquivo pela URL, então o bucket
      // privado precisa de uma presigned URL — a URL crua daria 403/500 no
      // fetch do provedor. Validade folgada (2h) p/ cobrir reentregas.
      const documentoUrl = (await this.minio.assinarUrlDeArquivo(pdfUrl, 2 * 60 * 60)) ?? pdfUrl;

      const mensagem = MENSAGEM;

      if (await this.messaging.disponivel()) {
        await this.messaging.enviarDocumento(
          {
            contato: conversa.contatoExterno,
            documentoUrl,
            nomeArquivo: 'agendamento.pdf',
            legenda: mensagem,
          },
          conversa.instanciaCanalId ?? undefined,
        );
      }

      // Registra a saída na conversa e bumpa ultimaInteracaoEm (@updatedAt).
      await this.prisma.mensagem.create({
        data: {
          conversaId: conversa.id,
          direcao: DirecaoMensagem.SAIDA,
          autor: AutorMensagem.BOT,
          tipo: TipoMensagem.DOCUMENTO,
          conteudo: mensagem,
          // URL crua/estável no histórico (a presigned `documentoUrl` é só p/ o
          // envio e expira); a tela assina sob demanda ao exibir.
          anexoUrl: pdfUrl,
        },
      });
      await this.prisma.conversa.update({
        where: { id: conversa.id },
        data: {},
      });
    } catch (err) {
      this.logger.error(
        `Falha ao enviar PDF do agendamento da solicitação ${solicitacaoId}: ${(err as Error).message}`,
      );
    }
  }

  // ---------------------------------------------------------------- privados

  private async registrar(
    s: SolicitacaoNotificavel,
    tipo: TipoNotificacao,
    conteudo: { titulo: string; corpo: string; enviarWhatsapp: boolean },
  ): Promise<void> {
    try {
      // Inbox in-app (canal PUSH) — só pra usuário cadastrado.
      if (s.solicitanteId) {
        await this.prisma.notificacao.create({
          data: {
            usuarioMariaId: s.solicitanteId,
            solicitacaoId: s.id,
            tipo,
            titulo: conteudo.titulo,
            corpo: conteudo.corpo,
            canal: CanalNotificacao.PUSH,
            status: StatusNotificacao.PENDENTE,
          },
        });

        // Push real na barra do aparelho (Expo) — melhor-esforço, nunca lança.
        await this.expoPush.enviarParaUsuario(s.solicitanteId, {
          titulo: conteudo.titulo,
          corpo: conteudo.corpo,
          dados: { solicitacaoId: s.id },
        });
      }

      if (conteudo.enviarWhatsapp && s.pacienteTelefoneWhatsapp) {
        await this.enviarWhatsapp(s, tipo, conteudo);
      }
    } catch (err) {
      this.logger.error(`Falha ao notificar solicitação ${s.protocolo}: ${(err as Error).message}`);
    }
  }

  private async enviarWhatsapp(
    s: SolicitacaoNotificavel,
    tipo: TipoNotificacao,
    conteudo: { titulo: string; corpo: string },
  ): Promise<void> {
    const contato = (s.pacienteTelefoneWhatsapp ?? '').replace(/\D/g, '');
    if (!contato) return;

    let status: StatusNotificacao = StatusNotificacao.PENDENTE;
    let mensagemMsgId: string | null = null;
    let enviadoEm: Date | null = null;

    if (await this.messaging.disponivel()) {
      try {
        const { idExterno } = await this.messaging.enviarTexto({
          contato,
          texto: conteudo.corpo,
        });
        status = StatusNotificacao.ENVIADA;
        mensagemMsgId = idExterno;
        enviadoEm = new Date();
      } catch (err) {
        status = StatusNotificacao.FALHA;
        this.logger.error(
          `WhatsApp da notificação ${s.protocolo} falhou: ${(err as Error).message}`,
        );
      }
    }

    await this.prisma.notificacao.create({
      data: {
        usuarioMariaId: s.solicitanteId,
        solicitacaoId: s.id,
        tipo,
        titulo: conteudo.titulo,
        corpo: conteudo.corpo,
        canal: CanalNotificacao.WHATSAPP,
        status,
        mensagemMsgId,
        enviadoEm,
      },
    });
  }

  private servico(s: SolicitacaoNotificavel): string {
    return s.especialidade?.nome ?? 'atendimento';
  }

  private primeiroNome(s: SolicitacaoNotificavel): string {
    return s.pacienteNome.split(' ').filter(Boolean)[0] ?? 'Olá';
  }
}
