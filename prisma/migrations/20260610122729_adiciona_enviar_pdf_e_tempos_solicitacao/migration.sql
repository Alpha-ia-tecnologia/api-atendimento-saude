-- AlterEnum
ALTER TYPE "TipoNoFluxo" ADD VALUE 'ENVIAR_PDF';

-- AlterTable
ALTER TABLE "solicitacoes" ADD COLUMN     "aprovada_em" TIMESTAMP(3),
ADD COLUMN     "assumida_em" TIMESTAMP(3);
