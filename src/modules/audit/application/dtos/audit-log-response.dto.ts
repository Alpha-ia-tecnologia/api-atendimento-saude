import { ApiProperty } from '@nestjs/swagger';

export class OperadorAuditDto {
  @ApiProperty() nomeCompleto!: string;
  @ApiProperty() email!: string;
}

export class AuditLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ required: false, nullable: true }) usuarioCrmId!: string | null;
  @ApiProperty({ required: false, nullable: true, type: OperadorAuditDto })
  operador!: OperadorAuditDto | null;
  @ApiProperty() acao!: string;
  @ApiProperty() recurso!: string;
  @ApiProperty({ required: false, nullable: true }) recursoId!: string | null;
  @ApiProperty({ required: false, nullable: true }) ipAddress!: string | null;
  @ApiProperty({ required: false, nullable: true }) userAgent!: string | null;
  @ApiProperty({ required: false, nullable: true, type: Object }) metadata!: unknown;
  @ApiProperty() criadoEm!: Date;
}
