-- CreateEnum
CREATE TYPE "CanalConversa" AS ENUM ('WEB', 'APP', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoConversa" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_SOLICITANTE', 'ENCERRADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "DirecaoMensagem" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "AutorMensagem" AS ENUM ('SOLICITANTE', 'BOT', 'GESTOR');

-- CreateEnum
CREATE TYPE "TipoMensagem" AS ENUM ('TEXTO', 'IMAGEM', 'DOCUMENTO', 'OPCAO', 'SISTEMA');

-- CreateTable
CREATE TABLE "conversas" (
    "id" UUID NOT NULL,
    "canal" "CanalConversa" NOT NULL DEFAULT 'WEB',
    "usuario_maria_id" UUID NOT NULL,
    "fluxo_chave" TEXT NOT NULL,
    "no_atual" TEXT,
    "estado" "EstadoConversa" NOT NULL DEFAULT 'ABERTA',
    "variaveis" JSONB NOT NULL DEFAULT '{}',
    "solicitacao_id" UUID,
    "iniciada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_interacao_em" TIMESTAMP(3) NOT NULL,
    "encerrada_em" TIMESTAMP(3),

    CONSTRAINT "conversas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" UUID NOT NULL,
    "conversa_id" UUID NOT NULL,
    "direcao" "DirecaoMensagem" NOT NULL,
    "autor" "AutorMensagem" NOT NULL,
    "tipo" "TipoMensagem" NOT NULL DEFAULT 'TEXTO',
    "conteudo" TEXT NOT NULL,
    "anexo_url" TEXT,
    "no_fluxo" TEXT,
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversas_solicitacao_id_key" ON "conversas"("solicitacao_id");

-- CreateIndex
CREATE INDEX "conversas_usuario_maria_id_idx" ON "conversas"("usuario_maria_id");

-- CreateIndex
CREATE INDEX "conversas_estado_idx" ON "conversas"("estado");

-- CreateIndex
CREATE INDEX "conversas_ultima_interacao_em_idx" ON "conversas"("ultima_interacao_em");

-- CreateIndex
CREATE INDEX "mensagens_conversa_id_idx" ON "mensagens"("conversa_id");

-- CreateIndex
CREATE INDEX "mensagens_conversa_id_criado_em_idx" ON "mensagens"("conversa_id", "criado_em");

-- AddForeignKey
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_usuario_maria_id_fkey" FOREIGN KEY ("usuario_maria_id") REFERENCES "usuarios_maria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
