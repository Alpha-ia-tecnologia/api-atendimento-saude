import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CriarVersaoDto {
  @ApiPropertyOptional({ enum: ['clonar', 'zero'], default: 'clonar' })
  @IsOptional()
  @IsIn(['clonar', 'zero'])
  modo?: 'clonar' | 'zero';

  @ApiPropertyOptional({ description: 'Versão base a clonar (default: a última).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  baseNumero?: number;
}
