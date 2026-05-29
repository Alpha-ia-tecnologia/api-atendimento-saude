import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TipoEspecialidade } from '@prisma/client';

export class ListarEspecialidadesDto {
  @ApiPropertyOptional({ enum: TipoEspecialidade, description: 'Filtra por tipo.' })
  @IsOptional()
  @IsEnum(TipoEspecialidade)
  tipo?: TipoEspecialidade;

  @ApiPropertyOptional({
    description: 'Quando true (default), retorna só as especialidades ativas no catálogo.',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : Boolean(value)))
  @IsBoolean()
  disponivel?: boolean = true;
}
