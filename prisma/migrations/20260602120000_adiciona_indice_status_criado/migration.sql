-- Índice composto para a fila do Kanban: filtra por status e ordena por criado_em (FIFO) com paginação.
CREATE INDEX "solicitacoes_status_criado_em_idx" ON "solicitacoes"("status", "criado_em");
