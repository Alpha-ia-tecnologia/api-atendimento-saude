import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEspecialidade } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CriarEspecialidadeDto {
  @ApiProperty({ example: 'Cardiologia' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ enum: TipoEspecialidade })
  @IsEnum(TipoEspecialidade)
  tipo!: TipoEspecialidade;

  @ApiPropertyOptional({ example: 'Coração e sistema circulatório' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  descricao?: string;

  @ApiPropertyOptional({ example: 'heart', description: 'Nome do ícone Lucide.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  disponivel?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
