import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { OrigemSolicitacao, StatusSolicitacao } from '@prisma/client';

/** Filtros da fila do gestor (read-only nesta fase). */
export class ListarSolicitacoesGestorDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: StatusSolicitacao })
  @IsOptional()
  @IsEnum(StatusSolicitacao)
  status?: StatusSolicitacao;

  @ApiPropertyOptional({ description: 'Filtra por especialidade.' })
  @IsOptional()
  @IsUUID()
  especialidadeId?: string;

  @ApiPropertyOptional({ description: 'Filtra por operador responsável (UUID).' })
  @IsOptional()
  @IsUUID()
  agenteResponsavelCrmId?: string;

  @ApiPropertyOptional({ enum: OrigemSolicitacao })
  @IsOptional()
  @IsEnum(OrigemSolicitacao)
  origem?: OrigemSolicitacao;

  @ApiPropertyOptional({ description: 'Início do período (ISO), por criadoEm.' })
  @IsOptional()
  @IsString()
  de?: string;

  @ApiPropertyOptional({ description: 'Fim do período (ISO), por criadoEm.' })
  @IsOptional()
  @IsString()
  ate?: string;

  @ApiPropertyOptional({ description: 'Filtra por protocolo (correspondência parcial).' })
  @IsOptional()
  @IsString()
  protocolo?: string;

  @ApiPropertyOptional({ description: 'Busca por nome, CPF ou protocolo.' })
  @IsOptional()
  @IsString()
  busca?: string;
}
