import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UsuarioMariaDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ description: 'CPF sem máscara (11 dígitos).' }) cpf!: string;
  @ApiProperty({ description: 'Data de nascimento ISO yyyy-mm-dd.' }) dataNascimento!: string;
  @ApiProperty() numeroWhatsapp!: string;
  @ApiProperty({ required: false, nullable: true }) endereco!: string | null;
  @ApiProperty({ required: false, nullable: true }) fotoPerfilUrl!: string | null;
  @ApiProperty() criadoEm!: Date;
}

export class LoginNovoResponseDto {
  @ApiProperty({ enum: ['NOVO'] })
  status!: 'NOVO';

  @ApiProperty({ description: 'CPF normalizado (somente dígitos).' })
  cpf!: string;

  @ApiProperty({ description: 'Data de nascimento mantida do login (dd/mm/aaaa).' })
  dataNascimento!: string;
}

export class LoginCadastradoResponseDto {
  @ApiProperty({ enum: ['CADASTRADO'] })
  status!: 'CADASTRADO';

  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: UsuarioMariaDto })
  usuario!: UsuarioMariaDto;
}

export class RegistroResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: UsuarioMariaDto })
  usuario!: UsuarioMariaDto;
}
