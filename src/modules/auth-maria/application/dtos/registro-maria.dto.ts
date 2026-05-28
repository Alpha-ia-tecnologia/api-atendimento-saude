import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegistroMariaDto {
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

  @ApiProperty({
    description: 'Nome completo (mínimo 2 palavras).',
    example: 'Maria das Graças Silva',
  })
  @IsString()
  @MinLength(3, { message: 'Nome muito curto.' })
  @Matches(/^\S+\s+\S+/, { message: 'Informe nome e sobrenome.' })
  nome!: string;

  @ApiProperty({
    description: 'Telefone com DDD (10 ou 11 dígitos), preferencialmente WhatsApp.',
    example: '98988012345',
  })
  @IsString()
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
    message: 'Telefone deve ter DDD + 8 ou 9 dígitos.',
  })
  telefone!: string;

  @ApiProperty({
    description: 'Endereço completo (rua, número, bairro, cidade).',
    example: 'Rua das Flores, 123 - Centro, São José de Ribamar/MA',
  })
  @IsString()
  @MinLength(10, { message: 'Endereço incompleto. Inclua rua, número, bairro e cidade.' })
  endereco!: string;

  @ApiProperty({ required: false, description: 'URL pública da foto de perfil (opcional).' })
  @IsOptional()
  @IsString()
  fotoPerfilUrl?: string;
}
