import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrigemSolicitacao,
  ParaQuem,
  StatusSolicitacao,
  TipoConsulta,
  TipoEspecialidade,
} from '@prisma/client';

export class PacienteSnapshotDto {
  @ApiProperty() nome!: string;
  @ApiProperty({ description: 'CPF sem máscara (11 dígitos).' }) cpf!: string;
  @ApiPropertyOptional({ nullable: true, description: 'yyyy-mm-dd' })
  dataNascimento!: string | null;
  @ApiPropertyOptional({ nullable: true }) endereco!: string | null;
  @ApiPropertyOptional({ nullable: true }) telefone!: string | null;
  @ApiPropertyOptional({ nullable: true }) telefoneWhatsapp!: string | null;
}

export class EspecialidadeMinDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ enum: TipoEspecialidade }) tipo!: TipoEspecialidade;
  @ApiPropertyOptional({ nullable: true }) icone!: string | null;
}

export class AgenteResponsavelDto {
  @ApiProperty() id!: string;
  @ApiProperty() nomeCompleto!: string;
}

export class SolicitacaoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: '2026551234' }) protocolo!: string;
  @ApiProperty({ enum: StatusSolicitacao }) status!: StatusSolicitacao;
  @ApiProperty({ enum: TipoEspecialidade }) tipo!: TipoEspecialidade;
  @ApiPropertyOptional({
    enum: TipoConsulta,
    nullable: true,
    description: 'PRIMEIRA ou RETORNO; null para exames.',
  })
  tipoConsulta!: TipoConsulta | null;
  @ApiProperty({ enum: ParaQuem }) paraQuem!: ParaQuem;
  @ApiProperty({ enum: OrigemSolicitacao }) origem!: OrigemSolicitacao;

  @ApiProperty({ type: EspecialidadeMinDto })
  especialidade!: EspecialidadeMinDto;

  @ApiProperty({ type: PacienteSnapshotDto })
  paciente!: PacienteSnapshotDto;

  @ApiProperty({ description: 'UUID do UsuarioMaria que enviou a solicitação.' })
  solicitanteId!: string;

  @ApiPropertyOptional({ nullable: true })
  motivoNaoAprovacao!: string | null;
  @ApiPropertyOptional({ nullable: true })
  dataAgendada!: Date | null;
  @ApiPropertyOptional({ nullable: true })
  dataRealizada!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Quando o paciente cancelou (null se não foi cancelada).',
  })
  canceladaEm!: Date | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Motivo do cancelamento informado pelo paciente.',
  })
  motivoCancelamento!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'URL do encaminhamento médico no MinIO (quando enviado).',
  })
  encaminhamentoUrl!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'URL do PDF do agendamento (SISREG) anexado ao aprovar.',
  })
  agendamentoPdfUrl!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: AgenteResponsavelDto,
    description: 'Operador que assumiu/decidiu (quando houver).',
  })
  agenteResponsavel!: AgenteResponsavelDto | null;

  @ApiProperty() criadoEm!: Date;
  @ApiProperty() atualizadoEm!: Date;
}
