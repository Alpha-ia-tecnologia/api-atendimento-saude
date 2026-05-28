import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty({ required: false, nullable: true }) organizationId!: string | null;
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}
