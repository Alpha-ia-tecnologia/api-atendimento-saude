/**
 * Seed idempotente do fluxo "Atendimento (Consulta + Exame)" — transcreve o
 * fluxo hardcoded `fluxoAtendimentoV1` para as tabelas Fluxo* versionadas como
 * FluxoVersao #1. Os textos que eram funções no código viram templates
 * `{{var}}` (interpolados pelo motor na fatia de cut-over).
 *
 * Os dados (nós, arestas, variáveis, layout) vivem em
 * `src/modules/seed/seed.data.ts` — fonte única compartilhada com o seed
 * automático de boot (`SeedService`).
 *
 * Rodar: `npm run seed:fluxo` (DATABASE_URL inline aponta o banco).
 * Idempotente: se já existir um FluxoAtendimento com o NOME abaixo, não faz nada.
 */
import { PrismaClient, StatusFluxoVersao, TipoFluxo } from '@prisma/client';

import {
  ARESTAS,
  calcularPosicoes,
  NOME_FLUXO,
  NOS,
  VARIAVEIS,
} from '../src/modules/seed/seed.data';

const prisma = new PrismaClient();

async function main() {
  const existente = await prisma.fluxoAtendimento.findFirst({
    where: { nome: NOME_FLUXO },
  });
  if (existente) {
    console.log(`Fluxo "${NOME_FLUXO}" já existe (${existente.id}). Nada a fazer.`);
    return;
  }

  const posicoes = calcularPosicoes();

  // Só pode existir UM fluxo publicado no sistema (índice único parcial).
  // Se outro fluxo já está publicado, semeia a versão como RASCUNHO.
  const jaHaPublicada = await prisma.fluxoVersao.findFirst({
    where: { status: StatusFluxoVersao.PUBLICADA },
    select: { id: true },
  });
  const statusInicial = jaHaPublicada ? StatusFluxoVersao.RASCUNHO : StatusFluxoVersao.PUBLICADA;

  await prisma.$transaction(async (tx) => {
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

    console.log(
      `Fluxo semeado: ${fluxo.id} · versão #1 ${statusInicial} · ` +
        `${NOS.length} nós · ${ARESTAS.length} arestas · ${VARIAVEIS.length} variáveis.`,
    );
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
