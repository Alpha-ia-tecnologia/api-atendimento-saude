-- Remove o valor ENVIAR_PDF do enum TipoNoFluxo (decisão revertida: o PDF é
-- enviado automaticamente na aprovação, não é um passo do grafo). Postgres não
-- permite DROP VALUE; recriamos o tipo (padrão do Prisma para AlterEnum).
BEGIN;
CREATE TYPE "TipoNoFluxo_new" AS ENUM ('INICIO', 'MENSAGEM', 'ESCOLHA', 'CONDICAO', 'ESPECIALIDADES', 'PERGUNTA_TEXTO', 'UPLOAD', 'ACAO_CRIAR_SOLICITACAO', 'REDIRECIONAR', 'FIM');
ALTER TABLE "fluxos_no" ALTER COLUMN "tipo" TYPE "TipoNoFluxo_new" USING ("tipo"::text::"TipoNoFluxo_new");
ALTER TYPE "TipoNoFluxo" RENAME TO "TipoNoFluxo_old";
ALTER TYPE "TipoNoFluxo_new" RENAME TO "TipoNoFluxo";
DROP TYPE "TipoNoFluxo_old";
COMMIT;
