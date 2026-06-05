-- AlterEnum: adiciona o tipo de nó INICIO (bloco de entrada do fluxo)
ALTER TYPE "TipoNoFluxo" ADD VALUE 'INICIO' BEFORE 'MENSAGEM';
