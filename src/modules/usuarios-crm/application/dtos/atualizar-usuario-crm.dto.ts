import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoPerfilCrm } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AtualizarUsuarioCrmDto {
  @ApiPropertyOptional({ example: 'Maria da Silva' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
  @MaxLength(120)
  nomeCompleto?: string;

  @ApiPropertyOptional({ enum: TipoPerfilCrm })
  @IsOptional()
  @IsEnum(TipoPerfilCrm, { message: 'Perfil inválido' })
  tipoPerfil?: TipoPerfilCrm;
}
