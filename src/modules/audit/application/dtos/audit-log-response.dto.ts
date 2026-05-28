import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ required: false, nullable: true }) userId!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty() resource!: string;
  @ApiProperty({ required: false, nullable: true }) resourceId!: string | null;
  @ApiProperty({ required: false, nullable: true }) ipAddress!: string | null;
  @ApiProperty({ required: false, nullable: true }) userAgent!: string | null;
  @ApiProperty({ required: false, nullable: true, type: Object }) metadata!: unknown;
  @ApiProperty() createdAt!: Date;
}
