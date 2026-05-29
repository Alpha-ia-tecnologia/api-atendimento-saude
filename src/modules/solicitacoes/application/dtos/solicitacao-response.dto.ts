import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrigemSolicitacao,
  ParaQuem,
  StatusSolicitacao,
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

export class SolicitacaoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: '2026551234' }) protocolo!: string;
  @ApiProperty({ enum: StatusSolicitacao }) status!: StatusSolicitacao;
  @ApiProperty({ enum: TipoEspecialidade }) tipo!: TipoEspecialidade;
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
    description: 'URL do encaminhamento médico no MinIO (quando enviado).',
  })
  encaminhamentoUrl!: string | null;

  @ApiProperty() criadoEm!: Date;
  @ApiProperty() atualizadoEm!: Date;
}
