import { Injectable } from '@nestjs/common';
import { TipoFluxo } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CriarFluxoDto } from '../dtos/criar-fluxo.dto';
import { CriarVersaoUseCase } from './criar-versao.use-case';
import { FluxoVersaoDetalhe } from '../fluxo.types';

/**
 * Cria um FluxoAtendimento novo + a versão #1 (RASCUNHO) já com o nó INICIO,
 * reusando o `CriarVersaoUseCase` no modo 'zero'. Retorna o detalhe da v1 para
 * o CRM abrir o editor direto.
 */
@Injectable()
export class CriarFluxoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly criarVersao: CriarVersaoUseCase,
  ) {}

  async execute(dto: CriarFluxoDto, criadoPorCrmId?: string): Promise<FluxoVersaoDetalhe> {
    const fluxo = await this.prisma.fluxoAtendimento.create({
      data: {
        nome: dto.nome,
        tipo: dto.tipo ?? TipoFluxo.OUTRO,
        descricao: dto.descricao ?? null,
      },
    });

    return this.criarVersao.execute(fluxo.id, criadoPorCrmId, { modo: 'zero' });
  }
}
