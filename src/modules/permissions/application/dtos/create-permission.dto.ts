import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'USER_VIEW', description: 'Formato MODULE_ACTION em maiúsculas' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9]*_[A-Z][A-Z0-9_]*$/, {
    message: 'Nome deve seguir o padrão MODULE_ACTION em maiúsculas',
  })
  name!: string;

  @ApiProperty({ example: 'USER' })
  @IsString()
  @IsNotEmpty()
  module!: string;

  @ApiProperty({ example: 'VIEW' })
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
