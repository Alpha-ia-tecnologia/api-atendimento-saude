import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token recebido no login' })
  @IsString()
  @IsNotEmpty()
  @IsJWT({ message: 'Refresh token inválido' })
  refreshToken!: string;
}
