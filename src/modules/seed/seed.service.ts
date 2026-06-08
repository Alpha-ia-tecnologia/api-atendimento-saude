import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StatusFluxoVersao,
  TipoFluxo,
  TipoPerfilCrm,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@shared/database/prisma/prisma.service';
import {
  ARESTAS,
  calcularPosicoes,
  ESPECIALIDADES,
  NOME_FLUXO,
  NOS,
  VARIAVEIS,
} from './seed.data';

/**
 * Semeia os dados essenciais automaticamente no boot da aplicação, mas só
 * quando ainda não foram semeados — cada etapa é idempotente e verifica o
 * estado atual antes de escrever. Assim o seed roda sozinho num banco recém
 * migrado sem precisar do `npm run seed` manual, e é um no-op quando os dados
 * já existem.
 *
 * Pode ser desligado com `SEED_ON_BOOT=false` (ex.: em produção, onde o seed
 * costuma rodar num passo separado do deploy).
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('SEED_ON_BOOT', 'true') === 'false') {
      this.logger.log('Seed automático desligado (SEED_ON_BOOT=false).');
      return;
    }

    try {
      await this.seedEspecialidades();
      await this.seedAdmin();
      await this.seedFluxo();
    } catch (error) {
      // Falha de seed não deve derrubar a aplicação — apenas registra para
      // diagnóstico (o banco pode estar indisponível ou ainda sem migração).
      this.logger.error('Falha ao semear dados no boot', (error as Error).stack);
    }
  }

  /** Especialidades/exames do catálogo (idempotente via contagem + upsert). */
  private async seedEspecialidades(): Promise<void> {
    const total = await this.prisma.especialidade.count();
    if (total > 0) {
      this.logger.log(`Especialidades já presentes (${total}). Pulando.`);
      return;
    }

    for (const especialidade of ESPECIALIDADES) {
      await this.prisma.especialidade.upsert({
        where: { nome: especialidade.nome },
        update: { tipo: especialidade.tipo, ordem: especialidade.ordem, disponivel: true },
        create: { ...especialidade, disponivel: true },
      });
    }
    this.logger.log(`Especialidades semeadas: ${ESPECIALIDADES.length}.`);
  }

  /** Usuário CRM admin inicial (idempotente: só cria se o e-mail não existir). */
  private async seedAdmin(): Promise<void> {
    const adminNome = this.config.get<string>('ADMIN_NAME', 'Administrador');
    const adminEmail = this.config.get<string>('ADMIN_EMAIL', 'admin@example.com');
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD', 'Admin@123');
    const saltRounds = Number(this.config.get<string>('BCRYPT_SALT_ROUNDS', '10'));

    const existente = await this.prisma.usuarioCrm.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    });
    if (existente) {
      this.logger.log(`Admin CRM já existe (${adminEmail}). Pulando.`);
      return;
    }

    const senhaHash = await bcrypt.hash(adminPassword, saltRounds);
    const admin = await this.prisma.usuarioCrm.create({
      data: {
        nomeCompleto: adminNome,
        email: adminEmail,
        senhaHash,
        tipoPerfil: TipoPerfilCrm.ADMIN,
        ativo: true,
      },
    });
    this.logger.log(`Admin CRM semeado: ${admin.email}.`);
  }

  /** Fluxo de atendimento v1 (idempotente: só cria se o fluxo não existir). */
  private async seedFluxo(): Promise<void> {
    const existente = await this.prisma.fluxoAtendimento.findFirst({
      where: { nome: NOME_FLUXO },
      select: { id: true },
    });
    if (existente) {
      this.logger.log(`Fluxo "${NOME_FLUXO}" já existe. Pulando.`);
      return;
    }

    const posicoes = calcularPosicoes();

    // Só pode existir UM fluxo publicado no sistema (índice único parcial).
    // Se outro fluxo já está publicado, semeia a versão como RASCUNHO.
    const jaHaPublicada = await this.prisma.fluxoVersao.findFirst({
      where: { status: StatusFluxoVersao.PUBLICADA },
      select: { id: true },
    });
    const statusInicial = jaHaPublicada
      ? StatusFluxoVersao.RASCUNHO
      : StatusFluxoVersao.PUBLICADA;

    await this.prisma.$transaction(async (tx) => {
      const fluxo = await tx.fluxoAtendimento.create({
        data: {
          nome: NOME_FLUXO,
          tipo: TipoFluxo.OUTRO,
          descricao: 'Fluxo seed migrado do atendimento-v1 (consulta + exame).',
          ativo: true,
        },
      });

      const versao = await tx.fluxoVersao.create({
        data: {
          fluxoAtendimentoId: fluxo.id,
          numero: 1,
          status: statusInicial,
          publicadaEm: statusInicial === StatusFluxoVersao.PUBLICADA ? new Date() : null,
        },
      });

      // Nós (captura id por chave para ligar as arestas).
      const idPorChave = new Map<string, string>();
      for (const n of NOS) {
        const pos = posicoes[n.chave];
        const criado = await tx.fluxoNo.create({
          data: {
            fluxoVersaoId: versao.id,
            chave: n.chave,
            tipo: n.tipo,
            conteudo: n.conteudo as object,
            posicaoX: pos.x,
            posicaoY: pos.y,
            ehInicial: n.ehInicial ?? false,
          },
        });
        idPorChave.set(n.chave, criado.id);
      }

      // Arestas (ordem por origem para condições determinísticas).
      const ordemPorOrigem = new Map<string, number>();
      for (const a of ARESTAS) {
        const ordem = ordemPorOrigem.get(a.de) ?? 0;
        ordemPorOrigem.set(a.de, ordem + 1);
        await tx.fluxoAresta.create({
          data: {
            fluxoVersaoId: versao.id,
            noOrigemId: idPorChave.get(a.de)!,
            noDestinoId: idPorChave.get(a.para)!,
            condicao: a.condicao as object,
            ordem,
          },
        });
      }

      // Variáveis.
      for (const v of VARIAVEIS) {
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

      this.logger.log(
        `Fluxo semeado: versão #1 ${statusInicial} · ${NOS.length} nós · ` +
          `${ARESTAS.length} arestas · ${VARIAVEIS.length} variáveis.`,
      );
    });
  }
}
