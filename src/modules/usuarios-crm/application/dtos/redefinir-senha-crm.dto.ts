import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RedefinirSenhaCrmDto {
  @ApiProperty({ minLength: 8, example: 'NovaSenha@123' })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter ao menos 8 caracteres' })
  @MaxLength(72, { message: 'Senha deve ter no máximo 72 caracteres' })
  senha!: string;
}
