-- Nó de Redirecionamento: encaminha para outro nó por referência (sem aresta),
-- evitando setas longas que cruzam o canvas.
ALTER TYPE "TipoNoFluxo" ADD VALUE 'REDIRECIONAR' AFTER 'ACAO_CRIAR_SOLICITACAO';
