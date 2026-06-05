-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "usuario_maria_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_usuario_maria_id_idx" ON "device_tokens"("usuario_maria_id");

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_usuario_maria_id_fkey" FOREIGN KEY ("usuario_maria_id") REFERENCES "usuarios_maria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
