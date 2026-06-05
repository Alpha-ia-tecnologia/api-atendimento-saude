import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class MoverFluxoDto {
  @ApiProperty({ description: 'Posição X do card no quadro.' })
  @IsInt()
  posicaoX!: number;

  @ApiProperty({ description: 'Posição Y do card no quadro.' })
  @IsInt()
  posicaoY!: number;
}
