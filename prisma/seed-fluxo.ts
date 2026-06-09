/**
 * Seed do fluxo "Atendimento (Consulta + Exame)" — grava o desenho definido em
 * `src/modules/seed/seed.data.ts` (fonte única, compartilhada com o seed de
 * boot via `semearFluxo`).
 *
 * Comportamento (seguro p/ produção): se o fluxo não existe, cria; se já existe,
 * sobrescreve o RASCUNHO (criando um novo se não houver) — NUNCA toca na versão
 * PUBLICADA. A versão publicada só muda quando alguém publica manualmente.
 *
 * Rodar: `npm run seed:fluxo` (DATABASE_URL inline aponta o banco).
 */
import { PrismaClient } from '@prisma/client';

import { NOME_FLUXO, SEED_FLUXO_REVISAO, semearFluxo } from '../src/modules/seed/seed.data';

const prisma = new PrismaClient();

async function main() {
  // CLI é execução explícita: sempre sobrescreve o rascunho (ignora a trava).
  const r = await semearFluxo(prisma, { forcar: true });
  const detalhe = r.status ? ` (${r.status} v#${r.numero})` : '';
  console.log(`Fluxo "${NOME_FLUXO}": ${r.acao}${detalhe} · revisão ${SEED_FLUXO_REVISAO}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
