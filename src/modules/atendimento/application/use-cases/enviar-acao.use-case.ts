import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AutorMensagem,
  DirecaoMensagem,
  EstadoConversa,
  Prisma,
  TipoMensagem,
} from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { AcaoEntrada, FlowEngineService } from '../services/flow-engine.service';
import { FluxoResolverService } from '../services/fluxo-resolver.service';
import { EnviarAcaoDto, TipoAcao } from '../dtos/enviar-acao.dto';
import { montarPasso } from '../mappers/passo.mapper';
import { PassoConversaResponseDto } from '../dtos/passo-conversa-response.dto';

@Injectable()
export class EnviarAcaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: FlowEngineService,
    private readonly resolver: FluxoResolverService,
  ) {}

  async execute(
    usuarioMariaId: string,
    conversaId: string,
    dto: EnviarAcaoDto,
  ): Promise<PassoConversaResponseDto> {
    const conversa = await this.prisma.conversa.findFirst({
      where: { id: conversaId, usuarioMariaId },
    });
    if (!conversa) {
      throw new NotFoundException('Conversa não encontrada.');
    }
    if (
      conversa.estado === EstadoConversa.ENCERRADA ||
      conversa.estado === EstadoConversa.EXPIRADA
    ) {
      throw new BadRequestException('Conversa encerrada. Inicie uma nova.');
    }

    const acao = this.mapearAcao(dto);

    // Usa a MESMA versão fixada no início (pinning): publicar não muda esta conversa.
    const fluxo = await this.resolver.resolverParaConversa(conversa.fluxoVersaoId);

    const passo = await this.engine.processar(
      {
        usuarioMariaId,
        noAtual: conversa.noAtual,
        variaveis: (conversa.variaveis ?? {}) as Record<string, unknown>,
        canal: conversa.canal,
      },
      acao,
      fluxo,
    );

    const encerrada = passo.estado === 'ENCERRADA';
    const variaveis = passo.variaveis as Record<string, unknown>;
    const solicitacaoId = variaveis._solicitacaoId ? String(variaveis._solicitacaoId) : null;

    await this.prisma.$transaction([
      // Mensagem de entrada (o que o solicitante fez)
      this.prisma.mensagem.create({
        data: {
          conversaId,
          direcao: DirecaoMensagem.ENTRADA,
          autor: AutorMensagem.SOLICITANTE,
          tipo: this.tipoEntrada(dto),
          conteudo: this.conteudoEntrada(dto),
          anexoUrl: dto.tipo === TipoAcao.ANEXO ? dto.anexoUrl : null,
          noFluxo: conversa.noAtual,
        },
      }),
      // Atualiza estado da conversa
      this.prisma.conversa.update({
        where: { id: conversaId },
        data: {
          noAtual: passo.noAtual,
          estado: encerrada ? EstadoConversa.ENCERRADA : EstadoConversa.EM_ANDAMENTO,
          variaveis: variaveis as Prisma.InputJsonValue,
          ...(solicitacaoId ? { solicitacaoId } : {}),
          ...(encerrada ? { encerradaEm: new Date() } : {}),
        },
      }),
      // Falas do bot neste passo
      ...passo.mensagens.map((m) =>
        this.prisma.mensagem.create({
          data: {
            conversaId,
            direcao: DirecaoMensagem.SAIDA,
            autor: AutorMensagem.BOT,
            conteudo: m.texto,
            noFluxo: passo.noAtual,
          },
        }),
      ),
    ]);

    return montarPasso({
      conversaId,
      mensagens: passo.mensagens,
      proximaAcao: passo.proximaAcao,
      protocolo: passo.protocolo,
      finalizada: passo.finalizada,
    });
  }

  private mapearAcao(dto: EnviarAcaoDto): AcaoEntrada {
    switch (dto.tipo) {
      case TipoAcao.OPCAO:
        return { tipo: 'opcao', opcaoId: dto.opcaoId };
      case TipoAcao.TEXTO:
        return { tipo: 'texto', texto: dto.texto };
      case TipoAcao.ANEXO:
        return { tipo: 'anexo', anexoUrl: dto.anexoUrl };
      default:
        return { tipo: 'iniciar' };
    }
  }

  private tipoEntrada(dto: EnviarAcaoDto): TipoMensagem {
    if (dto.tipo === TipoAcao.ANEXO) return TipoMensagem.IMAGEM;
    if (dto.tipo === TipoAcao.OPCAO) return TipoMensagem.OPCAO;
    return TipoMensagem.TEXTO;
  }

  private conteudoEntrada(dto: EnviarAcaoDto): string {
    if (dto.tipo === TipoAcao.ANEXO) return '📎 Anexo enviado';
    if (dto.tipo === TipoAcao.OPCAO) return dto.opcaoId ?? '';
    return dto.texto ?? '';
  }
}
