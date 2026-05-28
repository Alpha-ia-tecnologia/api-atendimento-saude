import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
  password!: string;
}
