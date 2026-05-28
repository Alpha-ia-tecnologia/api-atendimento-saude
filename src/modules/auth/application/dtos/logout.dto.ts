import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token a ser revogado', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsJWT({ message: 'Refresh token inválido' })
  refreshToken?: string;
}
