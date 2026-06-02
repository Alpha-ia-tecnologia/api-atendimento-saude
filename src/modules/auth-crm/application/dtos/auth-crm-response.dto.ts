import { ApiProperty } from '@nestjs/swagger';
import { TipoPerfilCrm } from '@prisma/client';

export class UsuarioCrmDto {
  @ApiProperty() id!: string;
  @ApiProperty() nomeCompleto!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: TipoPerfilCrm }) perfil!: TipoPerfilCrm;
}

export class AuthCrmResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: UsuarioCrmDto }) usuario!: UsuarioCrmDto;
}
