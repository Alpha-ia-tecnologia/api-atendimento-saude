import { ApiProperty } from '@nestjs/swagger';
import { OrganizationStatus } from '@prisma/client';

export class OrganizationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ required: false, nullable: true }) document!: string | null;
  @ApiProperty({ enum: OrganizationStatus }) status!: OrganizationStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
