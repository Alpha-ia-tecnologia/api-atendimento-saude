import { Injectable, Logger } from '@nestjs/common';
import { CanalConversa, StatusFluxoVersao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { grupoDoCanal } from '../../../fluxos/application/fluxo-interpolacao';
import { fluxoAtendimentoV1 } from '../flows/atendimento-v1.flow';
import { Fluxo } from '../flows/tipos';
import { materializarFluxo } from '../flows/materializar-fluxo';

/**
 * Resolve qual `Fluxo` (objeto que o motor executa) cada conversa deve usar.
 *
 * - Só existe UM fluxo publicado no sistema (regra garantida por índice único
 *   parcial no banco) — é a porta de entrada do atendimento (WhatsApp/App/Web).
 *   Publicar um fluxo é o que muda o atendimento das conversas novas.
 * - Versionamento por conversa: a conversa fixa `fluxoVersaoId` no início; os
 *   passos seguintes usam essa MESMA versão (publicar depois não a afeta).
 * - Versões publicadas são imutáveis → o `Fluxo` materializado é cacheado por id.
 * - Fallback seguro: sem versão (conversas antigas) ou versão inexistente →
 *   usa o fluxo hardcoded `fluxoAtendimentoV1`, preservando o comportamento atual.
 */
@Injectable()
export class FluxoResolverService {
  private readonly logger = new Logger(FluxoResolverService.name);
  private readonly cache = new Map<string, Fluxo>();

  constructor(private readonly prisma: PrismaService) {}

  /** A ÚNICA versão PUBLICADA do sistema, de qualquer fluxo (ou null). */
  async versaoPublicadaDoAtendimento(): Promise<{ id: string } | null> {
    const versao = await this.prisma.fluxoVersao.findFirst({
      where: { status: StatusFluxoVersao.PUBLICADA },
      // Cinto de segurança caso o índice único parcial ainda não exista.
      orderBy: { publicadaEm: 'desc' },
      select: { id: true },
    });
    return versao ?? null;
  }

  /**
   * Materializa (com cache) o subgrafo do canal da conversa; fallback hardcoded.
   * O cache é por `${versão}:${grupo}` (cada versão tem 2 grafos: Web/App e WhatsApp).
   */
  async resolverParaConversa(
    fluxoVersaoId: string | null,
    canal: CanalConversa = CanalConversa.WEB,
  ): Promise<Fluxo> {
    if (!fluxoVersaoId) return fluxoAtendimentoV1;

    const grupo = grupoDoCanal(canal);
    const chaveCache = `${fluxoVersaoId}:${grupo}`;
    const cacheado = this.cache.get(chaveCache);
    if (cacheado) return cacheado;

    const versao = await this.prisma.fluxoVersao.findUnique({
      where: { id: fluxoVersaoId },
      include: { nos: true, arestas: true },
    });
    if (!versao) {
      this.logger.warn(
        `Versão ${fluxoVersaoId} não encontrada — usando fluxo hardcoded (fallback).`,
      );
      return fluxoAtendimentoV1;
    }

    const fluxo = materializarFluxo(fluxoVersaoId, versao.nos, versao.arestas, grupo);
    this.cache.set(chaveCache, fluxo);
    return fluxo;
  }
}
