-- CreateEnum
CREATE TYPE "TipoFluxo" AS ENUM ('CONSULTA', 'EXAME', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoNoFluxo" AS ENUM ('MENSAGEM', 'ESCOLHA', 'ESPECIALIDADES', 'PERGUNTA_TEXTO', 'UPLOAD', 'ACAO_CRIAR_SOLICITACAO', 'FIM');

-- CreateEnum
CREATE TYPE "StatusFluxoVersao" AS ENUM ('RASCUNHO', 'PUBLICADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "TipoVariavelFluxo" AS ENUM ('TEXTO', 'CPF', 'DATA', 'ARQUIVO', 'OPCAO', 'TELEFONE');

-- CreateTable
CREATE TABLE "fluxos_atendimento" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoFluxo" NOT NULL DEFAULT 'OUTRO',
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxos_atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluxos_versao" (
    "id" UUID NOT NULL,
    "fluxo_atendimento_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "StatusFluxoVersao" NOT NULL DEFAULT 'RASCUNHO',
    "publicada_em" TIMESTAMP(3),
    "criado_por_crm_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxos_versao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluxos_no" (
    "id" UUID NOT NULL,
    "fluxo_versao_id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" "TipoNoFluxo" NOT NULL,
    "conteudo" JSONB NOT NULL DEFAULT '{}',
    "posicao_x" INTEGER NOT NULL DEFAULT 0,
    "posicao_y" INTEGER NOT NULL DEFAULT 0,
    "eh_inicial" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxos_no_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluxos_aresta" (
    "id" UUID NOT NULL,
    "fluxo_versao_id" UUID NOT NULL,
    "no_origem_id" UUID NOT NULL,
    "no_destino_id" UUID NOT NULL,
    "condicao" JSONB NOT NULL DEFAULT '{}',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxos_aresta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluxos_variavel" (
    "id" UUID NOT NULL,
    "fluxo_versao_id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "tipo" "TipoVariavelFluxo" NOT NULL DEFAULT 'TEXTO',
    "obrigatoria" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fluxos_variavel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fluxos_versao_fluxo_atendimento_id_idx" ON "fluxos_versao"("fluxo_atendimento_id");

-- CreateIndex
CREATE INDEX "fluxos_versao_status_idx" ON "fluxos_versao"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fluxos_versao_fluxo_atendimento_id_numero_key" ON "fluxos_versao"("fluxo_atendimento_id", "numero");

-- CreateIndex
CREATE INDEX "fluxos_no_fluxo_versao_id_idx" ON "fluxos_no"("fluxo_versao_id");

-- CreateIndex
CREATE UNIQUE INDEX "fluxos_no_fluxo_versao_id_chave_key" ON "fluxos_no"("fluxo_versao_id", "chave");

-- CreateIndex
CREATE INDEX "fluxos_aresta_fluxo_versao_id_idx" ON "fluxos_aresta"("fluxo_versao_id");

-- CreateIndex
CREATE INDEX "fluxos_aresta_no_origem_id_idx" ON "fluxos_aresta"("no_origem_id");

-- CreateIndex
CREATE INDEX "fluxos_variavel_fluxo_versao_id_idx" ON "fluxos_variavel"("fluxo_versao_id");

-- CreateIndex
CREATE UNIQUE INDEX "fluxos_variavel_fluxo_versao_id_chave_key" ON "fluxos_variavel"("fluxo_versao_id", "chave");

-- AddForeignKey
ALTER TABLE "fluxos_versao" ADD CONSTRAINT "fluxos_versao_fluxo_atendimento_id_fkey" FOREIGN KEY ("fluxo_atendimento_id") REFERENCES "fluxos_atendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxos_no" ADD CONSTRAINT "fluxos_no_fluxo_versao_id_fkey" FOREIGN KEY ("fluxo_versao_id") REFERENCES "fluxos_versao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxos_aresta" ADD CONSTRAINT "fluxos_aresta_fluxo_versao_id_fkey" FOREIGN KEY ("fluxo_versao_id") REFERENCES "fluxos_versao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxos_aresta" ADD CONSTRAINT "fluxos_aresta_no_origem_id_fkey" FOREIGN KEY ("no_origem_id") REFERENCES "fluxos_no"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxos_aresta" ADD CONSTRAINT "fluxos_aresta_no_destino_id_fkey" FOREIGN KEY ("no_destino_id") REFERENCES "fluxos_no"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluxos_variavel" ADD CONSTRAINT "fluxos_variavel_fluxo_versao_id_fkey" FOREIGN KEY ("fluxo_versao_id") REFERENCES "fluxos_versao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
