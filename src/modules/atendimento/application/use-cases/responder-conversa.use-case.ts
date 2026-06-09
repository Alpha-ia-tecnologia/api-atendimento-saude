import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AutorMensagem,
  CanalConversa,
  DirecaoMensagem,
  EstadoConversa,
  Prisma,
  TipoMensagem,
} from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { MESSAGING_PORT, MessagingPort } from '../../../whatsapp/domain/ports/messaging.port';
import { expirouPorInatividade } from '../conversa-inatividade';
import { ConversaDetalheDto } from '../dtos/conversa-response.dto';
import { ObterConversaGestorUseCase } from './obter-conversa-gestor.use-case';

@Injectable()
export class ResponderConversaUseCase {
  private readonly logger = new Logger(ResponderConversaUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly obter: ObterConversaGestorUseCase,
    @Inject(MESSAGING_PORT) private readonly messaging: MessagingPort,
  ) {}

  async execute(
    conversaId: string,
    operadorId: string,
    conteudo: string,
    instanciaId?: string | null,
  ): Promise<ConversaDetalheDto> {
    const conversa = await this.prisma.conversa.findUnique({
      where: { id: conversaId },
      select: {
        id: true,
        estado: true,
        canal: true,
        contatoExterno: true,
        instanciaCanalId: true,
        ultimaInteracaoEm: true,
      },
    });
    if (!conversa) {
      throw new NotFoundException('Conversa não encontrada.');
    }
    // Parada há mais de 24h → expira por inatividade.
    if (expirouPorInatividade(conversa.estado, conversa.ultimaInteracaoEm)) {
      await this.prisma.conversa.update({
        where: { id: conversa.id },
        data: { estado: EstadoConversa.EXPIRADA, encerradaEm: new Date() },
      });
      conversa.estado = EstadoConversa.EXPIRADA;
    }
    if (
      conversa.estado === EstadoConversa.ENCERRADA ||
      conversa.estado === EstadoConversa.EXPIRADA
    ) {
      throw new BadRequestException('Conversa encerrada — não é possível responder.');
    }

    const [mensagem] = await this.prisma.$transaction([
      this.prisma.mensagem.create({
        data: {
          conversaId,
          direcao: DirecaoMensagem.SAIDA,
          autor: AutorMensagem.GESTOR,
          tipo: TipoMensagem.TEXTO,
          conteudo: conteudo.trim(),
          // Operador que respondeu — rastreabilidade (Mensagem não tem FK de autor).
          metadados: { operadorId } as Prisma.InputJsonValue,
        },
      }),
      // Bumpa ultimaInteracaoEm (@updatedAt) e marca que a bola está com o solicitante.
      this.prisma.conversa.update({
        where: { id: conversaId },
        data: { estado: EstadoConversa.AGUARDANDO_SOLICITANTE },
      }),
    ]);

    // RF35: conversa de WhatsApp espelha a resposta do gestor no aparelho do
    // solicitante. Falha de envio não desfaz a mensagem — fica registrada no
    // metadados pra tela sinalizar.
    if (conversa.canal === CanalConversa.WHATSAPP && conversa.contatoExterno) {
      // Instância escolhida no modal, senão a que recebeu a conversa, senão a padrão.
      const instanciaEnvio = instanciaId ?? conversa.instanciaCanalId ?? undefined;
      try {
        const { idExterno } = await this.messaging.enviarTexto(
          {
            contato: conversa.contatoExterno,
            texto: conteudo.trim(),
          },
          instanciaEnvio,
        );
        await this.prisma.mensagem.update({
          where: { id: mensagem.id },
          data: { metadados: { operadorId, idExterno } as Prisma.InputJsonValue },
        });
      } catch (err) {
        this.logger.error(`Espelhamento no WhatsApp falhou: ${(err as Error).message}`);
        await this.prisma.mensagem.update({
          where: { id: mensagem.id },
          data: {
            metadados: {
              operadorId,
              erroEnvio: (err as Error).message,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    return this.obter.execute(conversaId);
  }
}
