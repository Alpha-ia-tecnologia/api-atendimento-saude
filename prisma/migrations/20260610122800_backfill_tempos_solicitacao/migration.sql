-- Backfill de assumida_em / aprovada_em a partir do log de auditoria, para que
-- o ranking de operadores (TME/TMA) reflita dados históricos. Usa o PRIMEIRO
-- evento de cada tipo por solicitação. Idempotente (só preenche quando nulo).

-- assumida_em ← primeiro evento SOLICITACAO_ASSUMIDA
UPDATE "solicitacoes" s
SET "assumida_em" = sub.primeiro
FROM (
  SELECT "recurso_id" AS sid, MIN("criado_em") AS primeiro
  FROM "audit_logs"
  WHERE "acao" = 'SOLICITACAO_ASSUMIDA' AND "recurso" = 'solicitacao' AND "recurso_id" IS NOT NULL
  GROUP BY "recurso_id"
) sub
WHERE s."id"::text = sub.sid AND s."assumida_em" IS NULL;

-- aprovada_em ← primeiro evento SOLICITACAO_APROVADA
UPDATE "solicitacoes" s
SET "aprovada_em" = sub.primeiro
FROM (
  SELECT "recurso_id" AS sid, MIN("criado_em") AS primeiro
  FROM "audit_logs"
  WHERE "acao" = 'SOLICITACAO_APROVADA' AND "recurso" = 'solicitacao' AND "recurso_id" IS NOT NULL
  GROUP BY "recurso_id"
) sub
WHERE s."id"::text = sub.sid AND s."aprovada_em" IS NULL;
