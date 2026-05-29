import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEspecialidade } from '@prisma/client';

export class EspecialidadeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Cardiologia' }) nome!: string;
  @ApiProperty({ enum: TipoEspecialidade }) tipo!: TipoEspecialidade;
  @ApiPropertyOptional({ nullable: true, example: 'Coração e sistema circulatório' })
  descricao!: string | null;
  @ApiPropertyOptional({
    nullable: true,
    example: 'heart',
    description: 'Nome do ícone Lucide. O front mapeia pro componente.',
  })
  icone!: string | null;
  @ApiProperty() disponivel!: boolean;
  @ApiProperty() ordem!: number;
}
