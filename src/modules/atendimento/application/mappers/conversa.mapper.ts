import {
  AutorMensagem,
  CanalConversa,
  EstadoConversa,
  Mensagem,
  TipoMensagem,
} from '@prisma/client';

import { MinioService } from '../../../files/application/services/minio.service';
import { ConversaDetalheDto, ConversaResumoDto, MensagemDto } from '../dtos/conversa-response.dto';

/**
 * Conversa + relações mínimas pro Inbox do gestor.
 * - `mensagens` na lista vem com 1 item (a última); no detalhe vem o histórico
 *   completo (ordem ascendente). Em ambos, a prévia usa o último item.
 */
export interface ConversaComRelacoes {
  id: string;
  canal: CanalConversa;
  estado: EstadoConversa;
  iniciadaEm: Date;
  ultimaInteracaoEm: Date;
  /** Null em conversa anônima de WhatsApp (sem cadastro no app). */
  usuarioMaria: { nome: string; cpf: string; fotoPerfilUrl: string | null } | null;
  /** Telefone do WhatsApp — identifica a conversa anônima. */
  contatoExterno?: string | null;
  /** Variáveis coletadas pelo fluxo — fallback de nome/CPF na anônima. */
  variaveis?: unknown;
  solicitacao: { protocolo: string } | null;
  mensagens: Mensagem[];
}

/** Identificação do paciente: cadastro quando há, senão o que o fluxo coletou. */
function pacienteDe(c: ConversaComRelacoes): {
  nome: string;
  cpf: string;
  fotoPerfilUrl: string | null;
} {
  if (c.usuarioMaria) return c.usuarioMaria;
  const v = (c.variaveis ?? {}) as Record<string, unknown>;
  const nome =
    String(v.nome ?? '').trim() ||
    (c.contatoExterno ? `WhatsApp +${c.contatoExterno}` : 'Solicitante anônimo');
  return { nome, cpf: String(v.cpf ?? ''), fotoPerfilUrl: null };
}

function previa(m?: Mensagem): { texto: string | null; autor: AutorMensagem | null } {
  if (!m) return { texto: null, autor: null };
  if (m.tipo === TipoMensagem.IMAGEM) return { texto: '📷 Imagem', autor: m.autor };
  if (m.tipo === TipoMensagem.DOCUMENTO) return { texto: '📄 Documento', autor: m.autor };
  return { texto: m.conteudo, autor: m.autor };
}

export function mapearConversaResumo(c: ConversaComRelacoes): ConversaResumoDto {
  const ultima = c.mensagens[c.mensagens.length - 1];
  const { texto, autor } = previa(ultima);
  return {
    id: c.id,
    canal: c.canal,
    estado: c.estado,
    paciente: pacienteDe(c),
    protocolo: c.solicitacao?.protocolo ?? null,
    ultimaMensagem: texto,
    ultimaMensagemAutor: autor,
    ultimaInteracaoEm: c.ultimaInteracaoEm,
    iniciadaEm: c.iniciadaEm,
  };
}

/** Detalhe: resumo + histórico, com as URLs de anexo assinadas pro front carregar. */
export async function mapearConversaDetalhe(
  c: ConversaComRelacoes,
  minio: MinioService,
): Promise<ConversaDetalheDto> {
  const resumo = mapearConversaResumo(c);
  const mensagens: MensagemDto[] = await Promise.all(
    c.mensagens.map(async (m) => ({
      id: m.id,
      autor: m.autor,
      direcao: m.direcao,
      tipo: m.tipo,
      conteudo: m.conteudo,
      anexoUrl: await minio.assinarUrlDeArquivo(m.anexoUrl),
      criadoEm: m.criadoEm,
    })),
  );
  return { ...resumo, mensagens };
}
