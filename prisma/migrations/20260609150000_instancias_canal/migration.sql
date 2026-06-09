-- Múltiplas instâncias por provedor + vínculo da conversa com a instância.
-- A tabela "integracoes_canal" é mantida (migração aditiva): as linhas
-- existentes (1 Evolution / 1 Meta) viram as primeiras instâncias.

-- provedor deixa de ser único (vários números por provedor).
DROP INDEX "integracoes_canal_provedor_key";

-- nome (apelido) — backfill por provedor e então NOT NULL.
ALTER TABLE "integracoes_canal" ADD COLUMN "nome" TEXT;
UPDATE "integracoes_canal"
   SET "nome" = CASE "provedor"
                  WHEN 'EVOLUTION' THEN 'Evolution'
                  WHEN 'META' THEN 'Meta Cloud'
                  ELSE 'WhatsApp'
                END
 WHERE "nome" IS NULL;
ALTER TABLE "integracoes_canal" ALTER COLUMN "nome" SET NOT NULL;

-- identificador de roteamento do webhook (instance name / phoneNumberId).
-- Não dá pra backfillar (está cifrado): populado no 1º salvar de cada instância.
ALTER TABLE "integracoes_canal" ADD COLUMN "identificador_externo" TEXT;

-- Índices da nova modelagem.
CREATE INDEX "integracoes_canal_provedor_idx" ON "integracoes_canal"("provedor");
CREATE UNIQUE INDEX "integracoes_canal_provedor_identificador_externo_key" ON "integracoes_canal"("provedor", "identificador_externo");

-- Conversa fixa a instância que a recebeu (null = legada/Web/App → usa padrão).
ALTER TABLE "conversas" ADD COLUMN "instancia_canal_id" UUID;
CREATE INDEX "conversas_instancia_canal_id_idx" ON "conversas"("instancia_canal_id");
ALTER TABLE "conversas"
  ADD CONSTRAINT "conversas_instancia_canal_id_fkey"
  FOREIGN KEY ("instancia_canal_id") REFERENCES "integracoes_canal"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
