-- CreateEnum
CREATE TYPE "ProvedorCanal" AS ENUM ('EVOLUTION', 'META');

-- CreateEnum
CREATE TYPE "StatusIntegracao" AS ENUM ('DESCONECTADA', 'CONECTADA', 'ERRO');

-- CreateTable
CREATE TABLE "integracoes_canal" (
    "id" UUID NOT NULL,
    "provedor" "ProvedorCanal" NOT NULL,
    "credenciais_cifradas" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusIntegracao" NOT NULL DEFAULT 'DESCONECTADA',
    "status_detalhe" TEXT,
    "verificado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_canal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integracoes_canal_provedor_key" ON "integracoes_canal"("provedor");
