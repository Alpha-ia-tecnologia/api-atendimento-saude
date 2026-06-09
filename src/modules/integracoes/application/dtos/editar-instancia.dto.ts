import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Edita uma instância existente. O provedor não muda (vem da própria linha).
 * Segredos vazios preservam o valor já salvo (permite editar sem reenviar).
 */
export class EditarInstanciaDto {
  @ApiPropertyOptional({ example: 'SEMUS principal' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  // ---- Evolution ----
  @ApiPropertyOptional({ example: 'https://evo.alpha.alphaia.online' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'SEMUS-ATUALIZADA' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  instance?: string;

  @ApiPropertyOptional({ example: 'minha-api-key' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  // ---- Meta Cloud ----
  @ApiPropertyOptional({ example: '102938475610293' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  wabaId?: string;

  @ApiPropertyOptional({ example: '556799999999' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  phoneNumberId?: string;

  @ApiPropertyOptional({ example: 'EAAG...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  accessToken?: string;

  @ApiPropertyOptional({ example: 'meu-verify-token' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  verifyToken?: string;
}
