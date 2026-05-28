import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrganizationStatus } from '@prisma/client';

export class ChangeOrganizationStatusDto {
  @ApiProperty({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  status!: OrganizationStatus;
}
