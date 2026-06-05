import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoNotificacao } from '@prisma/client';

export class NotificacaoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: TipoNotificacao }) tipo!: TipoNotificacao;
  @ApiPropertyOptional({ nullable: true }) titulo!: string | null;
  @ApiProperty() corpo!: string;
  @ApiPropertyOptional({ nullable: true }) solicitacaoId!: string | null;
  @ApiPropertyOptional({ nullable: true }) protocolo!: string | null;
  @ApiPropertyOptional({ nullable: true }) lidaEm!: Date | null;
  @ApiProperty() criadoEm!: Date;
}
