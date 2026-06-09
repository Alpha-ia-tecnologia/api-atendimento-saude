import { Injectable, NotFoundException } from '@nestjs/common';
import { AutorMensagem, EstadoConversa } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { expirouPorInatividade } from '../conversa-inatividade';
import { FlowEngineService } from '../services/flow-engine.service';
import { FluxoResolverService } from '../services/fluxo-resolver.service';
import { montarPasso } from '../mappers/passo.mapper';
import { PassoConversaResponseDto } from '../dtos/passo-conversa-response.dto';

@Injectable()
export class ObterConversaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: FlowEngineService,
    private readonly resolver: FluxoResolverService,
  ) {}

  /** Retoma uma conversa: devolve a próxima ação esperada no nó atual. */
  async execute(usuarioMariaId: string, conversaId: string): Promise<PassoConversaResponseDto> {
    const conversa = await this.prisma.conversa.findFirst({
      where: { id: conversaId, usuarioMariaId },
      include: { mensagens: { orderBy: { criadoEm: 'asc' } } },
    });
    if (!conversa) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    // Parada há mais de 24h → expira por inatividade (cliente recomeça do zero).
    if (expirouPorInatividade(conversa.estado, conversa.ultimaInteracaoEm)) {
      await this.prisma.conversa.update({
        where: { id: conversa.id },
        data: { estado: EstadoConversa.EXPIRADA, encerradaEm: new Date() },
      });
      conversa.estado = EstadoConversa.EXPIRADA;
    }

    const finalizada =
      conversa.estado === EstadoConversa.ENCERRADA ||
      conversa.estado === EstadoConversa.EXPIRADA;
    const fluxo = finalizada
      ? null
      : await this.resolver.resolverParaConversa(conversa.fluxoVersaoId, conversa.canal);
    const proximaAcao = finalizada
      ? ({ tipo: 'nenhum' } as const)
      : await this.engine.acaoAtual(
          conversa.noAtual,
          (conversa.variaveis ?? {}) as Record<string, unknown>,
          fluxo!,
        );

    // Histórico para o front reconstruir o chat ao retomar.
    const historico = conversa.mensagens.map((m) => ({
      texto: m.conteudo,
      imagemUri: m.anexoUrl ?? undefined,
      autor: m.autor === AutorMensagem.SOLICITANTE ? ('SOLICITANTE' as const) : ('BOT' as const),
    }));

    return montarPasso({
      conversaId: conversa.id,
      mensagens: historico,
      proximaAcao,
      finalizada,
    });
  }
}
