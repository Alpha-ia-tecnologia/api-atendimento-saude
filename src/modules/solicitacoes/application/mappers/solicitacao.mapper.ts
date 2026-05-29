import {
  Especialidade,
  Solicitacao,
  SolicitacaoAnexo,
  TipoAnexo,
} from '@prisma/client';

import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { formatarDataISO } from '../utils/formatters';

type SolicitacaoComRelacoes = Solicitacao & {
  especialidade: Especialidade;
  anexos: SolicitacaoAnexo[];
};

export function mapearSolicitacao(
  s: SolicitacaoComRelacoes,
): SolicitacaoResponseDto {
  // Encaminhamento = primeiro anexo de imagem (ou documento, se não houver imagem).
  // Se um dia tiver vários anexos por solicitação, mudamos pra `anexos: []`.
  const encaminhamento =
    s.anexos.find((a) => a.tipo === TipoAnexo.IMAGEM) ??
    s.anexos.find((a) => a.tipo === TipoAnexo.DOCUMENTO) ??
    s.anexos[0] ??
    null;

  return {
    id: s.id,
    protocolo: s.protocolo,
    status: s.status,
    tipo: s.tipo,
    paraQuem: s.paraQuem,
    origem: s.origem,

    especialidade: {
      id: s.especialidade.id,
      nome: s.especialidade.nome,
      tipo: s.especialidade.tipo,
      icone: s.especialidade.icone,
    },

    paciente: {
      nome: s.pacienteNome,
      cpf: s.pacienteCpf,
      dataNascimento: formatarDataISO(s.pacienteDataNascimento),
      endereco: s.pacienteEndereco,
      telefone: s.pacienteTelefone,
      telefoneWhatsapp: s.pacienteTelefoneWhatsapp,
    },

    solicitanteId: s.solicitanteId ?? '',
    motivoNaoAprovacao: s.motivoNaoAprovacao,
    dataAgendada: s.dataAgendada,
    dataRealizada: s.dataRealizada,
    encaminhamentoUrl: encaminhamento?.url ?? null,
    criadoEm: s.criadoEm,
    atualizadoEm: s.atualizadoEm,
  };
}
