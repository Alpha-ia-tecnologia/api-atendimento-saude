-- Regra: só pode existir UM fluxo publicado no sistema inteiro (o fluxo
-- publicado é o usado pelas conversas novas do atendimento automatizado).

-- 1) Saneamento: se hoje houver mais de uma versão PUBLICADA (entre todos os
--    fluxos), mantém só a mais recente e arquiva as demais.
UPDATE "fluxos_versao"
SET "status" = 'ARQUIVADA'
WHERE "status" = 'PUBLICADA'
  AND "id" <> (
    SELECT "id" FROM "fluxos_versao"
    WHERE "status" = 'PUBLICADA'
    ORDER BY "publicada_em" DESC NULLS LAST, "criado_em" DESC
    LIMIT 1
  );

-- 2) Garante no banco: no máximo UMA versão PUBLICADA globalmente.
--    Índice único parcial não é representável no schema.prisma — vive só
--    nesta migration; o `prisma migrate dev` não deve gerar DROP para ele.
CREATE UNIQUE INDEX "fluxos_versao_unica_publicada_idx"
  ON "fluxos_versao" ("status")
  WHERE "status" = 'PUBLICADA';
