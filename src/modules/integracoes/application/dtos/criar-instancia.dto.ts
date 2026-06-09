import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProvedorCanal } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cria uma instância de canal. Os campos de credencial são opcionais no DTO
 * (um provedor usa só os seus); a obrigatoriedade por provedor é validada no
 * use-case, que monta as credenciais corretas e cifra antes de salvar.
 */
export class CriarInstanciaDto {
  @ApiProperty({ enum: ProvedorCanal, example: ProvedorCanal.EVOLUTION })
  @IsEnum(ProvedorCanal, { message: 'provedor deve ser EVOLUTION ou META.' })
  provedor!: ProvedorCanal;

  @ApiProperty({ example: 'SEMUS principal' })
  @IsString()
  @MaxLength(120)
  nome!: string;

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
