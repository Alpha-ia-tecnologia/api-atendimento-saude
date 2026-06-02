import { ProximaAcao } from '../flows/tipos';
import { PassoConversaResponseDto } from '../dtos/passo-conversa-response.dto';

/** Mensagem que vai pro front: falas do bot (passo novo) ou histórico (retomada). */
export interface MensagemPasso {
  texto: string;
  imagemUri?: string;
  autor?: 'BOT' | 'SOLICITANTE';
}

/** Monta a resposta do passo enviada ao front. */
export function montarPasso(params: {
  conversaId: string;
  mensagens: MensagemPasso[];
  proximaAcao: ProximaAcao;
  protocolo?: string;
  finalizada: boolean;
}): PassoConversaResponseDto {
  return {
    conversaId: params.conversaId,
    mensagens: params.mensagens.map((m) => ({
      texto: m.texto,
      imagemUri: m.imagemUri,
      autor: m.autor,
    })),
    proximaAcao: params.proximaAcao,
    protocolo: params.protocolo,
    finalizada: params.finalizada,
  };
}
