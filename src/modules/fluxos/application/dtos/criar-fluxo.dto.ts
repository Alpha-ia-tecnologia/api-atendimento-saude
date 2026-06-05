import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoFluxo } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarFluxoDto {
  @ApiProperty({ example: 'Triagem odontológica' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @ApiPropertyOptional({ enum: TipoFluxo, default: TipoFluxo.OUTRO })
  @IsOptional()
  @IsEnum(TipoFluxo)
  tipo?: TipoFluxo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(280)
  descricao?: string;
}
