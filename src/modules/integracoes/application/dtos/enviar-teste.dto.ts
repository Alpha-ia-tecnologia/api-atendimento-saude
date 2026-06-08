import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class EnviarTesteDto {
  @ApiProperty({
    example: '(98) 99999-9999',
    description: 'Número de destino (DDD + número; o DDI 55 é assumido se faltar).',
  })
  @IsString()
  @MinLength(8, { message: 'Informe um número de telefone válido.' })
  @MaxLength(20)
  numero!: string;
}
