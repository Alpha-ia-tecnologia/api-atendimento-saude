import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UserRoleSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ required: false, nullable: true }) organizationId!: string | null;
  @ApiProperty({ type: [UserRoleSummaryDto] }) roles!: UserRoleSummaryDto[];
  @ApiProperty({ required: false, nullable: true }) lastLoginAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
