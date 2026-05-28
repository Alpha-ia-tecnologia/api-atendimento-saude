import { ApiProperty } from '@nestjs/swagger';
import { RoleStatus } from '@prisma/client';

export class RolePermissionSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class RoleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ required: false, nullable: true }) description!: string | null;
  @ApiProperty({ enum: RoleStatus }) status!: RoleStatus;
  @ApiProperty({ type: [RolePermissionSummaryDto] }) permissions!: RolePermissionSummaryDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
