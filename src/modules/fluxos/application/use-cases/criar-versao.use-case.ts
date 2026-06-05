import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusFluxoVersao, TipoNoFluxo } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ObterVersaoUseCase } from './obter-versao.use-case';
import { FluxoVersaoDetalhe } from '../fluxo.types';

export interface CriarVersaoOpcoes {
  /** 'clonar' (default) copia uma versão existente; 'zero' começa vazio. */
  modo?: 'clonar' | 'zero';
  /** Versão base a clonar (default: a de maior número). */
  baseNumero?: number;
}

/**
 * Cria um novo RASCUNHO. `clonar` faz deep copy de uma versão existente;
 * `zero` cria um fluxo novo só com o nó INICIO. Não altera a versão de origem.
 */
@Injectable()
export class CriarVersaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obter: ObterVersaoUseCase,
  ) {}

  async execute(
    fluxoId: string,
    criadoPorCrmId?: string,
    opcoes: CriarVersaoOpcoes = {},
  ): Promise<FluxoVersaoDetalhe> {
    const fluxo = await this.prisma.fluxoAtendimento.findUnique({
      where: { id: fluxoId },
    });
    if (!fluxo) throw new NotFoundException('Fluxo não encontrado.');

    const ultima = await this.prisma.fluxoVersao.findFirst({
      where: { fluxoAtendimentoId: fluxoId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const novoNumero = (ultima?.numero ?? 0) + 1;

    // Para clonar, carrega a base ANTES de criar a nova versão (senão a própria
    // versão recém-criada viraria a base). Sem `baseNumero` explícito, a base é
    // a versão PUBLICADA (o fluxo no ar) — não a de maior número, que pode ser
    // um rascunho vazio abandonado.
    let base: Awaited<ReturnType<typeof this.carregarBase>> = null;
    if (opcoes.modo !== 'zero') {
      let baseNumero = opcoes.baseNumero;
      if (!baseNumero) {
        const publicada = await this.prisma.fluxoVersao.findFirst({
          where: { fluxoAtendimentoId: fluxoId, status: StatusFluxoVersao.PUBLICADA },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        });
        baseNumero = publicada?.numero ?? ultima?.numero;
      }
      if (!baseNumero) throw new NotFoundException('Fluxo não tem versão para clonar.');
      base = await this.carregarBase(fluxoId, baseNumero);
      if (!base) throw new NotFoundException('Versão base não encontrada.');
    }

    const numero = await this.prisma.$transaction(async (tx) => {
      const versao = await tx.fluxoVersao.create({
        data: {
          fluxoAtendimentoId: fluxoId,
          numero: novoNumero,
          status: StatusFluxoVersao.RASCUNHO,
          criadoPorCrmId: criadoPorCrmId ?? null,
        },
      });

      if (!base) {
        // Fluxo do zero: só o nó de entrada.
        await tx.fluxoNo.create({
          data: {
            fluxoVersaoId: versao.id,
            chave: 'inicio',
            tipo: TipoNoFluxo.INICIO,
            conteudo: {},
            posicaoX: 80,
            posicaoY: 80,
            ehInicial: true,
          },
        });
        return versao.numero;
      }

      const idNovoPorAntigo = new Map<string, string>();
      for (const n of base.nos) {
        const criado = await tx.fluxoNo.create({
          data: {
            fluxoVersaoId: versao.id,
            chave: n.chave,
            tipo: n.tipo,
            conteudo: n.conteudo as Prisma.InputJsonValue,
            posicaoX: n.posicaoX,
            posicaoY: n.posicaoY,
            ehInicial: n.ehInicial,
          },
        });
        idNovoPorAntigo.set(n.id, criado.id);
      }
      for (const a of base.arestas) {
        await tx.fluxoAresta.create({
          data: {
            fluxoVersaoId: versao.id,
            noOrigemId: idNovoPorAntigo.get(a.noOrigemId)!,
            noDestinoId: idNovoPorAntigo.get(a.noDestinoId)!,
            condicao: a.condicao as Prisma.InputJsonValue,
            ordem: a.ordem,
          },
        });
      }
      for (const v of base.variaveis) {
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

      return versao.numero;
    });

    return this.obter.execute(fluxoId, numero);
  }

  /** Carrega uma versão (com nós/arestas/variáveis) para servir de base do clone. */
  private carregarBase(fluxoId: string, numero: number) {
    return this.prisma.fluxoVersao.findFirst({
      where: { fluxoAtendimentoId: fluxoId, numero },
      include: { nos: true, arestas: true, variaveis: true },
    });
  }
}
