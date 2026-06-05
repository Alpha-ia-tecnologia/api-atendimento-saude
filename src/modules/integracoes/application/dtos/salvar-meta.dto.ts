import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SalvarMetaDto {
  @ApiProperty({ example: '102938475610293' })
  @IsString()
  @MaxLength(120)
  wabaId!: string;

  @ApiProperty({ example: '556799999999' })
  @IsString()
  @MaxLength(120)
  phoneNumberId!: string;

  /**
   * Segredo. Opcional na edição: se vier vazio/ausente, mantém o accessToken
   * já salvo.
   */
  @ApiProperty({ required: false, example: 'EAAG...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  accessToken?: string;

  @ApiProperty({ example: 'meu-verify-token' })
  @IsString()
  @MaxLength(300)
  verifyToken!: string;
}
