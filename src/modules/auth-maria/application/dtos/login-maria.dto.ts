import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class LoginMariaDto {
  @ApiProperty({
    description: 'CPF do paciente (somente dígitos ou com máscara).',
    example: '12345678900',
  })
  @IsString()
  @Matches(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve ter 11 dígitos (com ou sem máscara).',
  })
  cpf!: string;

  @ApiProperty({
    description: 'Data de nascimento no formato dd/mm/aaaa.',
    example: '14/03/1952',
  })
  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'Data de nascimento deve estar no formato dd/mm/aaaa.',
  })
  dataNascimento!: string;
}
