import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshCrmDto {
  @ApiProperty({ description: 'Refresh token emitido no login.' })
  @IsString()
  @IsNotEmpty({ message: 'refreshToken é obrigatório.' })
  refreshToken!: string;
}
