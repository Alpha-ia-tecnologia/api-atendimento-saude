import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatusFluxoVersao } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ObterVersaoUseCase } from './obter-versao.use-case';
import { ValidarFluxoUseCase } from './validar-fluxo.use-case';
import { FluxoVersaoDetalhe } from '../fluxo.types';

/**
 * Publica uma versão RASCUNHO: valida; se OK, marca PUBLICADA e ARQUIVA a
 * publicada anterior de QUALQUER fluxo — só pode existir UM fluxo publicado
 * no sistema (é ele que atende as conversas novas). Versões publicadas são
 * imutáveis. Índice único parcial no banco garante a regra contra corridas
 * (migration `20260605120000_fluxo_publicado_unico_global`).
 */
@Injectable()
export class PublicarVersaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validar: ValidarFluxoUseCase,
    private readonly obter: ObterVersaoUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(fluxoId: string, numero: number, operadorId?: string): Promise<FluxoVersaoDetalhe> {
    const versao = await this.prisma.fluxoVersao.findFirst({
      where: { fluxoAtendimentoId: fluxoId, numero },
      include: { nos: true, arestas: true, variaveis: true },
    });
    if (!versao) throw new NotFoundException('Versão não encontrada.');
    if (versao.status === StatusFluxoVersao.PUBLICADA) {
      throw new BadRequestException('Esta versão já é a publicada.');
    }
    // Aceita RASCUNHO (publicar) ou ARQUIVADA (reativar uma versão antiga).

    const chavePorId = new Map(versao.nos.map((n) => [n.id, n.chave]));
    const resultado = this.validar.execute(
      versao.nos.map((n) => ({
        chave: n.chave,
        tipo: n.tipo,
        ehInicial: n.ehInicial,
        conteudo: (n.conteudo ?? {}) as Record<string, unknown>,
      })),
      versao.arestas.map((a) => ({
        origemChave: chavePorId.get(a.noOrigemId) ?? '',
        destinoChave: chavePorId.get(a.noDestinoId) ?? '',
      })),
      versao.variaveis.map((v) => v.chave),
    );
    if (!resultado.valido) {
      throw new BadRequestException({
        message: 'O fluxo tem problemas e não pode ser publicado.',
        problemas: resultado.problemas,
      });
    }

    await this.prisma.$transaction([
      // Arquiva a publicada anterior de qualquer fluxo (só há 1 global).
      this.prisma.fluxoVersao.updateMany({
        where: { status: StatusFluxoVersao.PUBLICADA },
        data: { status: StatusFluxoVersao.ARQUIVADA },
      }),
      this.prisma.fluxoVersao.update({
        where: { id: versao.id },
        data: { status: StatusFluxoVersao.PUBLICADA, publicadaEm: new Date() },
      }),
    ]);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId ?? null,
      action: 'FLUXO_PUBLICADO',
      resource: 'fluxo_versao',
      resourceId: versao.id,
      metadata: { fluxoId, numero },
    });

    return this.obter.execute(fluxoId, numero);
  }
}
