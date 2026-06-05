import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AcaoSimularDto {
  @ApiProperty({ enum: ['iniciar', 'opcao', 'texto', 'anexo'] })
  @IsIn(['iniciar', 'opcao', 'texto', 'anexo'])
  tipo!: 'iniciar' | 'opcao' | 'texto' | 'anexo';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  opcaoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  texto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anexoUrl?: string;
}

export class SimularDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  noAtual?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  variaveis?: Record<string, unknown>;

  @ApiProperty({ type: AcaoSimularDto })
  @ValidateNested()
  @Type(() => AcaoSimularDto)
  acao!: AcaoSimularDto;
}
