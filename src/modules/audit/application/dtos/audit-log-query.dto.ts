import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra pelo operador do CRM.' })
  @IsOptional()
  @IsUUID()
  usuarioCrmId?: string;

  @ApiPropertyOptional({ description: 'Ação exata (ex.: SOLICITACAO_APROVADA).' })
  @IsOptional()
  @IsString()
  acao?: string;

  @ApiPropertyOptional({ description: 'Recurso exato (ex.: solicitacao).' })
  @IsOptional()
  @IsString()
  recurso?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
