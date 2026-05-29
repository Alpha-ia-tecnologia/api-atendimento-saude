import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class AtualizarFotoPerfilDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'URL da foto retornada por POST /uploads/perfil. Mande `null` (ou omita) ' +
      'pra remover a foto.',
    example: 'https://minio.exemplo.com/atendimento-saude/perfis/uuid/abc.jpg',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsUrl({ require_protocol: true })
  fotoPerfilUrl?: string | null;
}
