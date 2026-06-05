-- Cut-over: cada conversa fixa a versão do fluxo com que começou (null = fallback hardcoded).
ALTER TABLE "conversas" ADD COLUMN "fluxo_versao_id" UUID;
CREATE INDEX "conversas_fluxo_versao_id_idx" ON "conversas"("fluxo_versao_id");

-- Posição do card no quadro de fluxos do CRM (compartilhada entre admins).
ALTER TABLE "fluxos_atendimento" ADD COLUMN "posicao_x" INTEGER;
ALTER TABLE "fluxos_atendimento" ADD COLUMN "posicao_y" INTEGER;
