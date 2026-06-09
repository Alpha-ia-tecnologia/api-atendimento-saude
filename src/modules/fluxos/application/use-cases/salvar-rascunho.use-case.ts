import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusFluxoVersao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SalvarRascunhoDto } from '../dtos/salvar-rascunho.dto';
import { ObterVersaoUseCase } from './obter-versao.use-case';
import { FluxoVersaoDetalhe } from '../fluxo.types';

/**
 * Substitui o conteúdo (nós/arestas/variáveis) de uma versão RASCUNHO.
 * Replace total — a versão é um rascunho em edição. Só RASCUNHO é editável.
 */
@Injectable()
export class SalvarRascunhoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obter: ObterVersaoUseCase,
  ) {}

  async execute(
    fluxoId: string,
    numero: number,
    dto: SalvarRascunhoDto,
  ): Promise<FluxoVersaoDetalhe> {
    const versao = await this.prisma.fluxoVersao.findFirst({
      where: { fluxoAtendimentoId: fluxoId, numero },
    });
    if (!versao) throw new NotFoundException('Versão não encontrada.');
    if (versao.status !== StatusFluxoVersao.RASCUNHO) {
      throw new BadRequestException(
        'Só é possível editar uma versão em RASCUNHO. Crie um rascunho para alterar.',
      );
    }

    // Chaves de nós duplicadas quebrariam o unique — valida cedo.
    const chaves = dto.nos.map((n) => n.chave);
    if (new Set(chaves).size !== chaves.length) {
      throw new BadRequestException('Há nós com a mesma chave.');
    }
    const conhecidas = new Set(chaves);
    for (const a of dto.arestas) {
      if (!conhecidas.has(a.origemChave) || !conhecidas.has(a.destinoChave)) {
        throw new BadRequestException(
          `Aresta referencia nó inexistente (${a.origemChave} → ${a.destinoChave}).`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Replace ESCOPADO ao canal: cada canal (Web/App e WhatsApp) é um grafo
      // próprio; salvar um canal não toca no outro. Variáveis são da versão.
      await tx.fluxoAresta.deleteMany({ where: { fluxoVersaoId: versao.id, canal: dto.canal } });
      await tx.fluxoNo.deleteMany({ where: { fluxoVersaoId: versao.id, canal: dto.canal } });
      await tx.fluxoVariavel.deleteMany({ where: { fluxoVersaoId: versao.id } });

      const idPorChave = new Map<string, string>();
      for (const n of dto.nos) {
        const criado = await tx.fluxoNo.create({
          data: {
            fluxoVersaoId: versao.id,
            canal: dto.canal,
            chave: n.chave,
            tipo: n.tipo,
            conteudo: n.conteudo as Prisma.InputJsonValue,
            posicaoX: Math.round(n.posicaoX),
            posicaoY: Math.round(n.posicaoY),
            ehInicial: n.ehInicial,
          },
        });
        idPorChave.set(n.chave, criado.id);
      }

      for (const a of dto.arestas) {
        await tx.fluxoAresta.create({
          data: {
            fluxoVersaoId: versao.id,
            canal: dto.canal,
            noOrigemId: idPorChave.get(a.origemChave)!,
            noDestinoId: idPorChave.get(a.destinoChave)!,
            condicao: a.condicao as Prisma.InputJsonValue,
            ordem: a.ordem,
          },
        });
      }

      for (const v of dto.variaveis) {
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
    });

    return this.obter.execute(fluxoId, numero);
  }
}
