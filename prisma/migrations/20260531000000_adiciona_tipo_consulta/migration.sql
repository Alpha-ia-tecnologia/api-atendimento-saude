-- CreateEnum
CREATE TYPE "TipoConsulta" AS ENUM ('PRIMEIRA', 'RETORNO');

-- AlterTable
ALTER TABLE "solicitacoes" ADD COLUMN "tipo_consulta" "TipoConsulta";
