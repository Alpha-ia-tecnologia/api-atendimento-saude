import { ApiPropertyOptional } from '@nestjs/swagger';
import { CanalConversa, EstadoConversa } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListarConversasGestorDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: EstadoConversa, description: 'Filtra pelo estado da conversa.' })
  @IsOptional()
  @IsEnum(EstadoConversa)
  estado?: EstadoConversa;

  @ApiPropertyOptional({
    enum: CanalConversa,
    description: 'Filtra pelo canal (APP/WEB/WHATSAPP).',
  })
  @IsOptional()
  @IsEnum(CanalConversa)
  canal?: CanalConversa;

  @ApiPropertyOptional({ description: 'Busca por nome ou CPF do solicitante.' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ description: 'Filtra pelo protocolo da solicitação vinculada.' })
  @IsOptional()
  @IsString()
  protocolo?: string;
}
