import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ResponderConversaDto {
  @ApiProperty({ description: 'Texto da resposta do operador ao solicitante.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  conteudo!: string;

  @ApiPropertyOptional({
    description:
      'Instância de WhatsApp para o envio. Omitido: usa a instância da conversa (ou a padrão).',
  })
  @IsOptional()
  @IsUUID()
  instanciaId?: string;
}
