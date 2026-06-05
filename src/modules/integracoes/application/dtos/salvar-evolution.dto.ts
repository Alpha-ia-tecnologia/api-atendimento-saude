import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SalvarEvolutionDto {
  @ApiProperty({ example: 'https://evo.alpha.alphaia.online' })
  @IsUrl({ require_tld: false }, { message: 'baseUrl deve ser uma URL válida.' })
  @MaxLength(300)
  baseUrl!: string;

  @ApiProperty({ example: 'SEMUS-ATUALIZADA' })
  @IsString()
  @MaxLength(120)
  instance!: string;

  /**
   * Segredo. Opcional na edição: se vier vazio/ausente, mantém o apiKey
   * já salvo (permite editar baseUrl/instance sem reenviar a chave).
   */
  @ApiProperty({ required: false, example: 'minha-api-key' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}
