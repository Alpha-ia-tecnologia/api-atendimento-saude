import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AlterarStatusUsuarioCrmDto {
  @ApiProperty({ description: 'true ativa a conta, false desativa.' })
  @IsBoolean({ message: 'O campo ativo deve ser booleano' })
  ativo!: boolean;
}
