import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoPerfilCrm } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';

export class ListarUsuariosCrmQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por status. true = ativos, false = inativos.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean({ message: 'O filtro ativo deve ser booleano' })
  ativo?: boolean;

  @ApiPropertyOptional({ enum: TipoPerfilCrm })
  @IsOptional()
  @IsEnum(TipoPerfilCrm, { message: 'Perfil inválido' })
  tipoPerfil?: TipoPerfilCrm;
}
