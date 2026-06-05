import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResponderConversaDto {
  @ApiProperty({ description: 'Texto da resposta do operador ao solicitante.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  conteudo!: string;
}
