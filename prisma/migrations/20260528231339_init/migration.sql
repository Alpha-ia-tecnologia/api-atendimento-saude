-- CreateEnum
CREATE TYPE "TipoPerfilCrm" AS ENUM ('ADMIN', 'SUPERVISOR', 'USUARIO');

-- CreateEnum
CREATE TYPE "TipoPerfilMaria" AS ENUM ('ADMIN', 'SOLICITANTE');

-- CreateEnum
CREATE TYPE "TipoEspecialidade" AS ENUM ('CONSULTA', 'EXAME', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('SOLICITADA', 'AGENDADA', 'NAO_APROVADA', 'REALIZADA', 'CANCELADA', 'NAO_COMPARECEU');

-- CreateEnum
CREATE TYPE "TipoAnexo" AS ENUM ('IMAGEM', 'DOCUMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "ParaQuem" AS ENUM ('EU', 'OUTRA');

-- CreateEnum
CREATE TYPE "OrigemSolicitacao" AS ENUM ('APP', 'WEB', 'WHATSAPP', 'CRM');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('WHATSAPP', 'PUSH', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('SOLICITACAO_CRIADA', 'SOLICITACAO_AGENDADA', 'SOLICITACAO_NAO_APROVADA', 'SOLICITACAO_REALIZADA', 'SOLICITACAO_CANCELADA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusNotificacao" AS ENUM ('PENDENTE', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHA');

-- CreateTable
CREATE TABLE "usuarios_crm" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "tipo_perfil" "TipoPerfilCrm" NOT NULL DEFAULT 'USUARIO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "excluido_em" TIMESTAMP(3),

    CONSTRAINT "usuarios_crm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_maria" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "endereco" TEXT,
    "numero_whatsapp" TEXT NOT NULL,
    "foto_perfil_url" TEXT,
    "tipo_perfil" "TipoPerfilMaria" NOT NULL DEFAULT 'SOLICITANTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_maria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_acessibilidade" (
    "usuario_maria_id" UUID NOT NULL,
    "alto_contraste" BOOLEAN NOT NULL DEFAULT false,
    "escala_fonte" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "narracao" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencias_acessibilidade_pkey" PRIMARY KEY ("usuario_maria_id")
);

-- CreateTable
CREATE TABLE "unidades_saude" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "cep" VARCHAR(8),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_saude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especialidades" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoEspecialidade" NOT NULL,
    "descricao" TEXT,
    "icone" TEXT,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" UUID NOT NULL,
    "protocolo" TEXT NOT NULL,
    "solicitante_id" UUID,
    "para_quem" "ParaQuem" NOT NULL DEFAULT 'EU',
    "paciente_nome" TEXT NOT NULL,
    "paciente_cpf" VARCHAR(11) NOT NULL,
    "paciente_data_nascimento" DATE,
    "paciente_endereco" TEXT,
    "paciente_telefone" TEXT,
    "paciente_telefone_whatsapp" TEXT,
    "unidade_saude_id" UUID,
    "especialidade_id" UUID NOT NULL,
    "tipo" "TipoEspecialidade" NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'SOLICITADA',
    "origem" "OrigemSolicitacao" NOT NULL DEFAULT 'APP',
    "agente_responsavel_crm_id" UUID,
    "motivo_nao_aprovacao" TEXT,
    "data_solicitada" TIMESTAMP(3),
    "data_agendada" TIMESTAMP(3),
    "data_realizada" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "enviado_em" TIMESTAMP(3),

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacao_anexos" (
    "id" UUID NOT NULL,
    "solicitacao_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoAnexo" NOT NULL,
    "mime_type" TEXT,
    "tamanho_bytes" INTEGER,
    "enviado_por_id" UUID NOT NULL,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacao_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "usuario_maria_id" UUID NOT NULL,
    "solicitacao_id" UUID,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT,
    "corpo" TEXT NOT NULL,
    "canal" "CanalNotificacao" NOT NULL,
    "status" "StatusNotificacao" NOT NULL DEFAULT 'PENDENTE',
    "mensagem_msg_id" TEXT,
    "enviado_em" TIMESTAMP(3),
    "lida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "usuario_crm_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "session_id" UUID NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "usuario_crm_id" UUID,
    "acao" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recurso_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_crm_email_key" ON "usuarios_crm"("email");

-- CreateIndex
CREATE INDEX "usuarios_crm_tipo_perfil_idx" ON "usuarios_crm"("tipo_perfil");

-- CreateIndex
CREATE INDEX "usuarios_crm_ativo_idx" ON "usuarios_crm"("ativo");

-- CreateIndex
CREATE INDEX "usuarios_crm_excluido_em_idx" ON "usuarios_crm"("excluido_em");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_maria_cpf_key" ON "usuarios_maria"("cpf");

-- CreateIndex
CREATE INDEX "usuarios_maria_tipo_perfil_idx" ON "usuarios_maria"("tipo_perfil");

-- CreateIndex
CREATE INDEX "usuarios_maria_ativo_idx" ON "usuarios_maria"("ativo");

-- CreateIndex
CREATE INDEX "usuarios_maria_numero_whatsapp_idx" ON "usuarios_maria"("numero_whatsapp");

-- CreateIndex
CREATE INDEX "unidades_saude_ativo_idx" ON "unidades_saude"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "especialidades_nome_key" ON "especialidades"("nome");

-- CreateIndex
CREATE INDEX "especialidades_tipo_idx" ON "especialidades"("tipo");

-- CreateIndex
CREATE INDEX "especialidades_disponivel_idx" ON "especialidades"("disponivel");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_protocolo_key" ON "solicitacoes"("protocolo");

-- CreateIndex
CREATE INDEX "solicitacoes_solicitante_id_idx" ON "solicitacoes"("solicitante_id");

-- CreateIndex
CREATE INDEX "solicitacoes_paciente_cpf_idx" ON "solicitacoes"("paciente_cpf");

-- CreateIndex
CREATE INDEX "solicitacoes_unidade_saude_id_idx" ON "solicitacoes"("unidade_saude_id");

-- CreateIndex
CREATE INDEX "solicitacoes_especialidade_id_idx" ON "solicitacoes"("especialidade_id");

-- CreateIndex
CREATE INDEX "solicitacoes_agente_responsavel_crm_id_idx" ON "solicitacoes"("agente_responsavel_crm_id");

-- CreateIndex
CREATE INDEX "solicitacoes_status_idx" ON "solicitacoes"("status");

-- CreateIndex
CREATE INDEX "solicitacoes_origem_idx" ON "solicitacoes"("origem");

-- CreateIndex
CREATE INDEX "solicitacoes_para_quem_idx" ON "solicitacoes"("para_quem");

-- CreateIndex
CREATE INDEX "solicitacao_anexos_solicitacao_id_idx" ON "solicitacao_anexos"("solicitacao_id");

-- CreateIndex
CREATE INDEX "solicitacao_anexos_enviado_por_id_idx" ON "solicitacao_anexos"("enviado_por_id");

-- CreateIndex
CREATE INDEX "notificacoes_usuario_maria_id_idx" ON "notificacoes"("usuario_maria_id");

-- CreateIndex
CREATE INDEX "notificacoes_solicitacao_id_idx" ON "notificacoes"("solicitacao_id");

-- CreateIndex
CREATE INDEX "notificacoes_status_idx" ON "notificacoes"("status");

-- CreateIndex
CREATE INDEX "notificacoes_canal_idx" ON "notificacoes"("canal");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_crm_id_idx" ON "refresh_tokens"("usuario_crm_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_revogado_em_idx" ON "refresh_tokens"("revogado_em");

-- CreateIndex
CREATE INDEX "audit_logs_usuario_crm_id_idx" ON "audit_logs"("usuario_crm_id");

-- CreateIndex
CREATE INDEX "audit_logs_acao_idx" ON "audit_logs"("acao");

-- CreateIndex
CREATE INDEX "audit_logs_recurso_idx" ON "audit_logs"("recurso");

-- CreateIndex
CREATE INDEX "audit_logs_criado_em_idx" ON "audit_logs"("criado_em");

-- AddForeignKey
ALTER TABLE "preferencias_acessibilidade" ADD CONSTRAINT "preferencias_acessibilidade_usuario_maria_id_fkey" FOREIGN KEY ("usuario_maria_id") REFERENCES "usuarios_maria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios_maria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_unidade_saude_id_fkey" FOREIGN KEY ("unidade_saude_id") REFERENCES "unidades_saude"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_especialidade_id_fkey" FOREIGN KEY ("especialidade_id") REFERENCES "especialidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_agente_responsavel_crm_id_fkey" FOREIGN KEY ("agente_responsavel_crm_id") REFERENCES "usuarios_crm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_anexos" ADD CONSTRAINT "solicitacao_anexos_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_anexos" ADD CONSTRAINT "solicitacao_anexos_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios_maria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_maria_id_fkey" FOREIGN KEY ("usuario_maria_id") REFERENCES "usuarios_maria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_crm_id_fkey" FOREIGN KEY ("usuario_crm_id") REFERENCES "usuarios_crm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuario_crm_id_fkey" FOREIGN KEY ("usuario_crm_id") REFERENCES "usuarios_crm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
