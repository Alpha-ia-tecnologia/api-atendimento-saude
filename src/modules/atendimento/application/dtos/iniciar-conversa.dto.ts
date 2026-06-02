import { ApiPropertyOptional } from '@nestjs/swagger';
import { CanalConversa } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Corpo (opcional) ao iniciar uma conversa. O canal define a `origem` da
 * Solicitacao criada ao fim do fluxo. Default: WEB (compatível com a Web atual).
 */
export class IniciarConversaDto {
  @ApiPropertyOptional({
    enum: CanalConversa,
    default: CanalConversa.WEB,
    description: 'Canal de origem do atendimento. App envia APP; Web omite (WEB).',
  })
  @IsOptional()
  @IsEnum(CanalConversa)
  canal?: CanalConversa;
}
