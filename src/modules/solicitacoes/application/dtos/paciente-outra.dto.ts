import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Dados do paciente quando `paraQuem === 'OUTRA'`. Essa pessoa NÃO precisa
 * ter cadastro no app — os campos viram snapshot direto na Solicitacao.
 */
export class PacienteOutraDto {
  @ApiProperty({ example: 'José Pereira de Souza' })
  @IsString()
  @MinLength(3)
  @Matches(/^\S+\s+\S+/, { message: 'Informe nome e sobrenome do paciente.' })
  nome!: string;

  @ApiProperty({ example: '98765432100', description: '11 dígitos (com ou sem máscara).' })
  @IsString()
  @Matches(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF do paciente deve ter 11 dígitos.',
  })
  cpf!: string;

  @ApiPropertyOptional({
    example: '12/05/1980',
    description: 'Data de nascimento do paciente no formato dd/mm/aaaa.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'Data de nascimento do paciente deve estar em dd/mm/aaaa.',
  })
  dataNascimento?: string;

  @ApiPropertyOptional({ example: '98991234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
    message: 'Telefone do paciente deve ter DDD + 8 ou 9 dígitos.',
  })
  telefone?: string;

  @ApiPropertyOptional({ example: 'Av. Beira Mar, 458 - Mãe Quitéria, São José de Ribamar/MA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  endereco?: string;
}
