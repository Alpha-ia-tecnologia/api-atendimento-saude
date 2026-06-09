import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TipoPerfilCrm } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@shared/database/prisma/prisma.service';
import { ESPECIALIDADES, NOME_FLUXO, SEED_FLUXO_REVISAO, semearFluxo } from './seed.data';

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

  /**
   * Fluxo de atendimento. Aplica o desenho do seed automaticamente: cria o
   * fluxo quando ausente e, quando já existe, sobrescreve apenas o RASCUNHO
   * (nunca a PUBLICADA) — e só quando a revisão do seed muda (trava p/ não
   * atropelar edição manual a cada boot).
   */
  private async seedFluxo(): Promise<void> {
    const r = await semearFluxo(this.prisma, { forcar: false });
    if (r.acao === 'sem-mudanca') {
      this.logger.log(`Fluxo "${NOME_FLUXO}" já na revisão ${SEED_FLUXO_REVISAO}. Pulando.`);
      return;
    }
    this.logger.log(
      `Fluxo "${NOME_FLUXO}" ${r.acao}` +
        `${r.status ? ` (${r.status} v#${r.numero})` : ''} · revisão ${SEED_FLUXO_REVISAO}.`,
    );
  }
}
