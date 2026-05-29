import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

/**
 * PATCH — só atualiza o que vier no body. Campos ausentes ficam como estão.
 */
export class AtualizarAcessibilidadeDto {
  @ApiPropertyOptional({
    enum: [0, 1, 2],
    description: '0=Normal, 1=Grande, 2=Extra Grande',
  })
  @IsOptional()
  @IsIn([0, 1, 2])
  escalaFonte?: 0 | 1 | 2;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  altoContraste?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  narracao?: boolean;
}
