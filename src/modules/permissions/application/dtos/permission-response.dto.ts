import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ required: false, nullable: true }) description!: string | null;
  @ApiProperty() module!: string;
  @ApiProperty() action!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
