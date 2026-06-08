import { ApiProperty } from '@nestjs/swagger';
import { TipoPerfilCrm } from '@prisma/client';

/** Representação de um operador do CRM para as telas de administração. */
export class UsuarioCrmAdminDto {
  @ApiProperty() id!: string;
  @ApiProperty() nomeCompleto!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: TipoPerfilCrm }) tipoPerfil!: TipoPerfilCrm;
  @ApiProperty() ativo!: boolean;
  @ApiProperty({ nullable: true, type: String }) ultimoLoginEm!: string | null;
  @ApiProperty() criadoEm!: string;
}
