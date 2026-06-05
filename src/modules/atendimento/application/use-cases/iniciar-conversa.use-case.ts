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
import { FluxoResolverService } from '../services/fluxo-resolver.service';
import { montarPasso } from '../mappers/passo.mapper';
import { PassoConversaResponseDto } from '../dtos/passo-conversa-response.dto';

@Injectable()
export class IniciarConversaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: FlowEngineService,
    private readonly resolver: FluxoResolverService,
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

    // Fixa a versão publicada do fluxo de atendimento (pinning por conversa).
    const versaoPublicada = await this.resolver.versaoPublicadaDoAtendimento();
    const fluxo = await this.resolver.resolverParaConversa(versaoPublicada?.id ?? null);

    const passo = await this.engine.processar(
      { usuarioMariaId, noAtual: null, variaveis: variaveisIniciais, canal },
      { tipo: 'iniciar' },
      fluxo,
    );

    const conversa = await this.prisma.conversa.create({
      data: {
        canal,
        usuarioMariaId,
        fluxoChave: FLUXO_ATENDIMENTO_V1,
        fluxoVersaoId: versaoPublicada?.id ?? null,
        noAtual: passo.noAtual,
        estado:
          passo.estado === 'ENCERRADA' ? EstadoConversa.ENCERRADA : EstadoConversa.EM_ANDAMENTO,
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
