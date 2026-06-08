import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class MetricasDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Início do período (ISO). Default: 30 dias atrás.',
    example: '2026-05-01',
  })
  @IsOptional()
  @IsISO8601()
  de?: string;

  @ApiPropertyOptional({
    description: 'Fim do período (ISO). Default: agora.',
    example: '2026-06-08',
  })
  @IsOptional()
  @IsISO8601()
  ate?: string;

  @ApiPropertyOptional({ description: 'Filtra por especialidade.' })
  @IsOptional()
  @IsUUID()
  especialidadeId?: string;
}
