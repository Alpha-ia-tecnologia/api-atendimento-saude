-- Flag de triagem do encaminhamento: true quando o OCR reprovou a foto além do
-- limite de tentativas e a solicitação precisa de revisão manual do operador.
ALTER TABLE "solicitacoes" ADD COLUMN "revisar_anexo" BOOLEAN NOT NULL DEFAULT false;
