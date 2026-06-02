import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginCrmDto {
  @ApiProperty({ example: 'admin@example.com', description: 'E-mail do operador.' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @ApiProperty({ example: 'Admin@123', description: 'Senha (mínimo 6 caracteres).' })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres.' })
  senha!: string;
}
