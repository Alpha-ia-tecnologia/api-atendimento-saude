import { Injectable, NotFoundException } from '@nestjs/common';
import { AutorMensagem, EstadoConversa } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { FlowEngineService } from '../services/flow-engine.service';
import { montarPasso } from '../mappers/passo.mapper';
import { PassoConversaResponseDto } from '../dtos/passo-conversa-response.dto';

@Injectable()
export class ObterConversaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: FlowEngineService,
  ) {}

  /** Retoma uma conversa: devolve a próxima ação esperada no nó atual. */
  async execute(
    usuarioMariaId: string,
    conversaId: string,
  ): Promise<PassoConversaResponseDto> {
    const conversa = await this.prisma.conversa.findFirst({
      where: { id: conversaId, usuarioMariaId },
      include: { mensagens: { orderBy: { criadoEm: 'asc' } } },
    });
    if (!conversa) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    const finalizada = conversa.estado === EstadoConversa.ENCERRADA;
    const proximaAcao = finalizada
      ? ({ tipo: 'nenhum' } as const)
      : await this.engine.acaoAtual(
          conversa.noAtual,
          (conversa.variaveis ?? {}) as Record<string, unknown>,
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
