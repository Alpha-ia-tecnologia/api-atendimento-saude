import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CanalFluxo, Prisma, StatusFluxoVersao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ObterVersaoUseCase } from './obter-versao.use-case';
import { FluxoVersaoDetalhe } from '../fluxo.types';

/**
 * Copia o subgrafo de um canal para outro dentro da mesma versão RASCUNHO
 * (ex.: Web/App → WhatsApp), para começar o segundo fluxo a partir de uma cópia.
 * Sobrescreve totalmente o canal de destino.
 */
@Injectable()
export class ClonarCanalUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obter: ObterVersaoUseCase,
  ) {}

  async execute(
    fluxoId: string,
    numero: number,
    de: CanalFluxo,
    para: CanalFluxo,
  ): Promise<FluxoVersaoDetalhe> {
    if (de === para) throw new BadRequestException('Os canais de origem e destino são iguais.');

    const versao = await this.prisma.fluxoVersao.findFirst({
      where: { fluxoAtendimentoId: fluxoId, numero },
      include: { nos: true, arestas: true },
    });
    if (!versao) throw new NotFoundException('Versão não encontrada.');
    if (versao.status !== StatusFluxoVersao.RASCUNHO) {
      throw new BadRequestException('Só é possível editar uma versão em RASCUNHO.');
    }

    const nosDe = versao.nos.filter((n) => n.canal === de);
    const arestasDe = versao.arestas.filter((a) => a.canal === de);

    await this.prisma.$transaction(async (tx) => {
      // Sobrescreve o canal de destino.
      await tx.fluxoAresta.deleteMany({ where: { fluxoVersaoId: versao.id, canal: para } });
      await tx.fluxoNo.deleteMany({ where: { fluxoVersaoId: versao.id, canal: para } });

      const novoIdPorAntigo = new Map<string, string>();
      for (const n of nosDe) {
        const criado = await tx.fluxoNo.create({
          data: {
            fluxoVersaoId: versao.id,
            canal: para,
            chave: n.chave,
            tipo: n.tipo,
            conteudo: (n.conteudo ?? {}) as Prisma.InputJsonValue,
            posicaoX: n.posicaoX,
            posicaoY: n.posicaoY,
            ehInicial: n.ehInicial,
          },
        });
        novoIdPorAntigo.set(n.id, criado.id);
      }

      for (const a of arestasDe) {
        const origem = novoIdPorAntigo.get(a.noOrigemId);
        const destino = novoIdPorAntigo.get(a.noDestinoId);
        if (!origem || !destino) continue;
        await tx.fluxoAresta.create({
          data: {
            fluxoVersaoId: versao.id,
            canal: para,
            noOrigemId: origem,
            noDestinoId: destino,
            condicao: (a.condicao ?? {}) as Prisma.InputJsonValue,
            ordem: a.ordem,
          },
        });
      }
    });

    return this.obter.execute(fluxoId, numero);
  }
}
