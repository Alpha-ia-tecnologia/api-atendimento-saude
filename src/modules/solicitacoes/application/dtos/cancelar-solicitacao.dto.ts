import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelarSolicitacaoDto {
  @ApiPropertyOptional({
    description: 'Por que o paciente está cancelando (texto livre).',
    minLength: 3,
    maxLength: 500,
    example: 'Consegui resolver com particular antes da chamada.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Motivo muito curto.' })
  @MaxLength(500, { message: 'Motivo muito longo (máx. 500 caracteres).' })
  motivo?: string;
}
