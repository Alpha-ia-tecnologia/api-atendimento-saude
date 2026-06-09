-- Dois grafos por versão de fluxo: Web/App e WhatsApp editados separadamente.
CREATE TYPE "CanalFluxo" AS ENUM ('WEB_APP', 'WHATSAPP');

-- Linhas existentes ficam como WEB_APP (o fluxo atual passa a ser o de Web/App).
ALTER TABLE "fluxos_no" ADD COLUMN "canal" "CanalFluxo" NOT NULL DEFAULT 'WEB_APP';
ALTER TABLE "fluxos_aresta" ADD COLUMN "canal" "CanalFluxo" NOT NULL DEFAULT 'WEB_APP';

-- A mesma chave pode existir nos dois canais → unique passa a incluir o canal.
DROP INDEX "fluxos_no_fluxo_versao_id_chave_key";
CREATE UNIQUE INDEX "fluxos_no_fluxo_versao_id_canal_chave_key" ON "fluxos_no"("fluxo_versao_id", "canal", "chave");
