import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AutorMensagem,
  CanalConversa,
  DirecaoMensagem,
  EstadoConversa,
  TipoMensagem,
} from '@prisma/client';

export class PacienteConversaDto {
  @ApiProperty() nome!: string;
  @ApiProperty() cpf!: string;
  @ApiPropertyOptional({ nullable: true }) fotoPerfilUrl!: string | null;
}

export class MensagemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AutorMensagem }) autor!: AutorMensagem;
  @ApiProperty({ enum: DirecaoMensagem }) direcao!: DirecaoMensagem;
  @ApiProperty({ enum: TipoMensagem }) tipo!: TipoMensagem;
  @ApiProperty() conteudo!: string;
  @ApiPropertyOptional({ nullable: true }) anexoUrl!: string | null;
  @ApiProperty() criadoEm!: Date;
}

/** Item da lista de conversas (Inbox). */
export class ConversaResumoDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CanalConversa }) canal!: CanalConversa;
  @ApiProperty({ enum: EstadoConversa }) estado!: EstadoConversa;
  @ApiProperty({ type: PacienteConversaDto }) paciente!: PacienteConversaDto;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Protocolo da solicitação vinculada (se houver).',
  })
  protocolo!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Prévia da última mensagem.' })
  ultimaMensagem!: string | null;
  @ApiPropertyOptional({ enum: AutorMensagem, nullable: true })
  ultimaMensagemAutor!: AutorMensagem | null;
  @ApiProperty() ultimaInteracaoEm!: Date;
  @ApiProperty() iniciadaEm!: Date;
}

/** Detalhe de uma conversa, com o histórico completo de mensagens. */
export class ConversaDetalheDto extends ConversaResumoDto {
  @ApiProperty({ type: [MensagemDto] }) mensagens!: MensagemDto[];
}
