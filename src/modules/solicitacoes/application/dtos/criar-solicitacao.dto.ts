import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OrigemSolicitacao, ParaQuem, TipoConsulta } from '@prisma/client';

import { PacienteOutraDto } from './paciente-outra.dto';

export class CriarSolicitacaoDto {
  @ApiProperty({
    description: 'UUID da especialidade escolhida no chat.',
    example: 'a1b2c3d4-...',
  })
  @IsUUID()
  especialidadeId!: string;

  @ApiProperty({
    enum: ParaQuem,
    description: 'EU = paciente é o solicitante logado. OUTRA = dados em `paciente`.',
  })
  @IsEnum(ParaQuem)
  paraQuem!: ParaQuem;

  @ApiPropertyOptional({
    enum: TipoConsulta,
    description:
      'PRIMEIRA ou RETORNO. Obrigatório quando a especialidade for do tipo CONSULTA; ignorado pra EXAME/OUTRO.',
  })
  @IsOptional()
  @IsEnum(TipoConsulta)
  tipoConsulta?: TipoConsulta;

  @ApiProperty({
    enum: OrigemSolicitacao,
    description: 'Canal por onde veio a solicitação.',
    example: OrigemSolicitacao.WEB,
  })
  @IsEnum(OrigemSolicitacao)
  origem!: OrigemSolicitacao;

  @ApiPropertyOptional({
    type: PacienteOutraDto,
    description:
      'Obrigatório quando paraQuem=OUTRA. Ignorado quando paraQuem=EU (snapshot é tirado do UsuarioMaria do solicitante).',
  })
  @ValidateIf((o: CriarSolicitacaoDto) => o.paraQuem === ParaQuem.OUTRA)
  @ValidateNested()
  @Type(() => PacienteOutraDto)
  paciente?: PacienteOutraDto;

  @ApiPropertyOptional({
    description:
      'URL pública do encaminhamento médico (foto/PDF) já hospedado. Quando integrarmos com MinIO, o cliente faz upload e passa aqui a URL retornada.',
    example: 'https://minio.exemplo.com/maria-anexos/abc123.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  encaminhamentoUrl?: string;
}
