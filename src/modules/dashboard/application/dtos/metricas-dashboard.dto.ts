import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigemSolicitacao, StatusSolicitacao, TipoEspecialidade } from '@prisma/client';

export class EspecialidadeMetricaDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ enum: TipoEspecialidade }) tipo!: TipoEspecialidade;
  @ApiProperty() total!: number;
}

export class VolumeDiaDto {
  @ApiProperty({ example: '2026-06-08' }) data!: string;
  @ApiProperty() total!: number;
}

export class PicoHoraDiaDto {
  @ApiProperty({ description: '0=domingo … 6=sábado' }) diaSemana!: number;
  @ApiProperty({ description: '0–23' }) hora!: number;
  @ApiProperty() total!: number;
}

export class OperadorRankingDto {
  @ApiProperty() operadorId!: string;
  @ApiProperty() nome!: string;

  @ApiProperty({ description: 'Qtd. de solicitações EM_ATENDIMENTO do operador no período.' })
  emAtendimento!: number;

  @ApiProperty({ description: 'Qtd. de solicitações AGENDADA do operador no período.' })
  aprovadas!: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Tempo médio de espera (segundos): AVG(assumida_em - criado_em).',
  })
  tmeSegundos!: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Tempo médio de atendimento (segundos): AVG(aprovada_em - assumida_em).',
  })
  tmaSegundos!: number | null;
}

export class MetricasDashboardDto {
  @ApiProperty({ description: 'Início efetivo do período (ISO).' })
  de!: string;

  @ApiProperty({ description: 'Fim efetivo do período (ISO).' })
  ate!: string;

  @ApiProperty({ description: 'Total de solicitações no período.' })
  total!: number;

  @ApiProperty({
    description: 'Contagem por status (todas as chaves presentes, 0 quando vazio).',
    example: { SOLICITADA: 3, EM_ATENDIMENTO: 1, AGENDADA: 5 },
  })
  porStatus!: Record<StatusSolicitacao, number>;

  @ApiProperty({ description: 'Contagem por origem do canal.' })
  porOrigem!: Record<OrigemSolicitacao, number>;

  @ApiProperty({ type: [EspecialidadeMetricaDto] })
  porEspecialidade!: EspecialidadeMetricaDto[];

  @ApiProperty({ type: [VolumeDiaDto] })
  volumePorDia!: VolumeDiaDto[];

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Tempo médio (em horas) de criação → realização.',
  })
  tempoMedioAtendimentoHoras!: number | null;

  @ApiProperty({ type: [PicoHoraDiaDto] })
  picoPorHoraDia!: PicoHoraDiaDto[];

  @ApiProperty({
    type: [OperadorRankingDto],
    description: 'Ranking de operadores no período (ordenado por aprovadas, depois em atendimento).',
  })
  rankingOperadores!: OperadorRankingDto[];
}
