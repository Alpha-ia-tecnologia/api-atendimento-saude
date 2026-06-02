import {
  Especialidade,
  Solicitacao,
  SolicitacaoAnexo,
  TipoAnexo,
  UsuarioCrm,
} from '@prisma/client';

import { MinioService } from '../../../files/application/services/minio.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { formatarDataISO } from '../utils/formatters';

type SolicitacaoComRelacoes = Solicitacao & {
  especialidade: Especialidade;
  anexos: SolicitacaoAnexo[];
  /** Opcional: presente nas consultas do gestor. */
  agenteResponsavel?: UsuarioCrm | null;
};

/**
 * Mapeia Solicitacao + relações pro DTO de resposta.
 *
 * Async porque assina a URL do encaminhamento via MinIO presigner —
 * isso garante que o front consegue carregar a foto mesmo se o bucket
 * for privado. URLs externas (CDN, etc) passam direto.
 */
export async function mapearSolicitacao(
  s: SolicitacaoComRelacoes,
  minio: MinioService,
): Promise<SolicitacaoResponseDto> {
  const encaminhamento =
    s.anexos.find((a) => a.tipo === TipoAnexo.IMAGEM) ??
    s.anexos.find((a) => a.tipo === TipoAnexo.DOCUMENTO) ??
    s.anexos[0] ??
    null;

  const encaminhamentoUrl = await minio.assinarUrlDeArquivo(encaminhamento?.url);
  const agendamentoPdfUrl = await minio.assinarUrlDeArquivo(s.agendamentoPdfUrl);

  return {
    id: s.id,
    protocolo: s.protocolo,
    status: s.status,
    tipo: s.tipo,
    tipoConsulta: s.tipoConsulta,
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
    canceladaEm: s.canceladaEm,
    motivoCancelamento: s.motivoCancelamento,
    encaminhamentoUrl,
    agendamentoPdfUrl,
    agenteResponsavel: s.agenteResponsavel
      ? { id: s.agenteResponsavel.id, nomeCompleto: s.agenteResponsavel.nomeCompleto }
      : null,
    criadoEm: s.criadoEm,
    atualizadoEm: s.atualizadoEm,
  };
}
