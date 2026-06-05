import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class DeviceTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(200)
  token!: string;

  @ApiProperty({ enum: ['ios', 'android'], example: 'android' })
  @IsIn(['ios', 'android'])
  plataforma!: 'ios' | 'android';
}

export class RemoverDeviceTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(200)
  token!: string;
}
