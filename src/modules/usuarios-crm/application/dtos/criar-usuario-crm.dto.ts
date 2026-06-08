import { ApiProperty } from '@nestjs/swagger';
import { TipoPerfilCrm } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarUsuarioCrmDto {
  @ApiProperty({ example: 'Maria da Silva' })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
  @MaxLength(120)
  nomeCompleto!: string;

  @ApiProperty({ example: 'operador@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @ApiProperty({ minLength: 8, example: 'Senha@123' })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter ao menos 8 caracteres' })
  @MaxLength(72, { message: 'Senha deve ter no máximo 72 caracteres' })
  senha!: string;

  @ApiProperty({ enum: TipoPerfilCrm, example: TipoPerfilCrm.USUARIO })
  @IsEnum(TipoPerfilCrm, { message: 'Perfil inválido' })
  tipoPerfil!: TipoPerfilCrm;
}
