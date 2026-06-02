import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AutorMensagem,
  CanalConversa,
  DirecaoMensagem,
  EstadoConversa,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { FLUXO_ATENDIMENTO_V1 } from '../flows/atendimento-v1.flow';
import { FlowEngineService } from '../services/flow-engine.service';
import { montarPasso } from '../mappers/passo.mapper';
import { PassoConversaResponseDto } from '../dtos/passo-conversa-response.dto';

@Injectable()
export class IniciarConversaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: FlowEngineService,
  ) {}

  async execute(
    usuarioMariaId: string,
    canal: CanalConversa = CanalConversa.WEB,
  ): Promise<PassoConversaResponseDto> {
    const usuario = await this.prisma.usuarioMaria.findUnique({
      where: { id: usuarioMariaId },
    });
    if (!usuario || !usuario.ativo) {
      throw new NotFoundException('Solicitante não encontrado ou inativo.');
    }

    // Pré-carrega o perfil pras telas de "É pra mim mesmo".
    const variaveisIniciais = {
      _perfil: {
        nome: usuario.nome,
        cpf: usuario.cpf,
        telefone: usuario.numeroWhatsapp,
        endereco: usuario.endereco ?? '',
      },
    };

    const passo = await this.engine.processar(
      { usuarioMariaId, noAtual: null, variaveis: variaveisIniciais, canal },
      { tipo: 'iniciar' },
    );

    const conversa = await this.prisma.conversa.create({
      data: {
        canal,
        usuarioMariaId,
        fluxoChave: FLUXO_ATENDIMENTO_V1,
        noAtual: passo.noAtual,
        estado:
          passo.estado === 'ENCERRADA'
            ? EstadoConversa.ENCERRADA
            : EstadoConversa.EM_ANDAMENTO,
        variaveis: passo.variaveis as Prisma.InputJsonValue,
        mensagens: {
          create: passo.mensagens.map((m) => ({
            direcao: DirecaoMensagem.SAIDA,
            autor: AutorMensagem.BOT,
            conteudo: m.texto,
            noFluxo: passo.noAtual,
          })),
        },
      },
      select: { id: true },
    });

    return montarPasso({
      conversaId: conversa.id,
      mensagens: passo.mensagens,
      proximaAcao: passo.proximaAcao,
      protocolo: passo.protocolo,
      finalizada: passo.finalizada,
    });
  }
}
