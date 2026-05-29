import { ApiProperty } from '@nestjs/swagger';

export class AcessibilidadeResponseDto {
  @ApiProperty({
    enum: [0, 1, 2],
    description: '0=Normal, 1=Grande, 2=Extra Grande',
    example: 1,
  })
  escalaFonte!: 0 | 1 | 2;

  @ApiProperty({ description: 'Alto contraste ativado.' })
  altoContraste!: boolean;

  @ApiProperty({ description: 'Narração (TalkBack/VoiceOver assistido) ativada.' })
  narracao!: boolean;
}
