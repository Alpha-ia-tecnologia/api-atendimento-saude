import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CanalNotificacao,
  OrigemSolicitacao,
  StatusNotificacao,
  TipoNotificacao,
} from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
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
