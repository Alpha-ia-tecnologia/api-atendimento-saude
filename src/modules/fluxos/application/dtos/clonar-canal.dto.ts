import { ApiProperty } from '@nestjs/swagger';
import { CanalFluxo } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ClonarCanalDto {
  @ApiProperty({ enum: CanalFluxo, description: 'Canal de origem (copiar de).' })
  @IsEnum(CanalFluxo)
  de!: CanalFluxo;

  @ApiProperty({ enum: CanalFluxo, description: 'Canal de destino (sobrescrito).' })
  @IsEnum(CanalFluxo)
  para!: CanalFluxo;
}
