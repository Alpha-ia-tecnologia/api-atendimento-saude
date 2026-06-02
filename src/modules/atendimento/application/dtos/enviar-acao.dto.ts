import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export enum TipoAcao {
  OPCAO = 'opcao',
  TEXTO = 'texto',
  ANEXO = 'anexo',
}

/**
 * Ação do solicitante dentro de uma conversa. O motor decide o próximo passo.
 * - opcao: usuário tocou num botão (`opcaoId`).
 * - texto: usuário respondeu uma pergunta (`texto`).
 * - anexo: usuário enviou um arquivo já hospedado (`anexoUrl`).
 */
export class EnviarAcaoDto {
  @ApiProperty({ enum: TipoAcao })
  @IsEnum(TipoAcao)
  tipo!: TipoAcao;

  @ApiPropertyOptional({ description: 'Id da opção escolhida (quando tipo=opcao).' })
  @ValidateIf((o: EnviarAcaoDto) => o.tipo === TipoAcao.OPCAO)
  @IsString()
  opcaoId?: string;

  @ApiPropertyOptional({ description: 'Texto digitado (quando tipo=texto).' })
  @ValidateIf((o: EnviarAcaoDto) => o.tipo === TipoAcao.TEXTO)
  @IsString()
  texto?: string;

  @ApiPropertyOptional({ description: 'URL do anexo já hospedado (quando tipo=anexo).' })
  @ValidateIf((o: EnviarAcaoDto) => o.tipo === TipoAcao.ANEXO)
  @IsString()
  @IsUrl({ require_protocol: true })
  anexoUrl?: string;
}
