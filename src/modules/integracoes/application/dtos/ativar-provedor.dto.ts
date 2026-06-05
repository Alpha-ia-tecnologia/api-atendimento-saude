import { ApiProperty } from '@nestjs/swagger';
import { ProvedorCanal } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AtivarProvedorDto {
  @ApiProperty({ enum: ProvedorCanal, example: ProvedorCanal.META })
  @IsEnum(ProvedorCanal, { message: 'provedor deve ser EVOLUTION ou META.' })
  provedor!: ProvedorCanal;
}
