-- DropForeignKey
ALTER TABLE "solicitacao_anexos" DROP CONSTRAINT "solicitacao_anexos_enviado_por_id_fkey";

-- AlterTable
ALTER TABLE "conversas" ADD COLUMN     "contato_externo" TEXT,
ALTER COLUMN "usuario_maria_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "solicitacao_anexos" ALTER COLUMN "enviado_por_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "conversas_contato_externo_idx" ON "conversas"("contato_externo");

-- AddForeignKey
ALTER TABLE "solicitacao_anexos" ADD CONSTRAINT "solicitacao_anexos_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios_maria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
