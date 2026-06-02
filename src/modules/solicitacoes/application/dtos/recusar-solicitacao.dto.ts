import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RecusarSolicitacaoDto {
  @ApiProperty({
    description: 'Motivo da recusa (obrigatório).',
    example: 'Encaminhamento ilegível.',
  })
  @IsString()
  @IsNotEmpty({ message: 'O motivo da recusa é obrigatório.' })
  @MinLength(3, { message: 'Descreva o motivo da recusa.' })
  @MaxLength(500)
  motivo!: string;
}
