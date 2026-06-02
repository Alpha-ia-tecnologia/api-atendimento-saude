import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MensagemSaidaDto {
  @ApiProperty() texto!: string;
  @ApiPropertyOptional({ nullable: true }) imagemUri?: string;

  @ApiPropertyOptional({
    enum: ['BOT', 'SOLICITANTE'],
    description:
      'Autor da fala. Presente ao retomar (GET) para reconstruir o histórico; ' +
      'ausente nos passos novos (sempre falas do bot).',
  })
  autor?: 'BOT' | 'SOLICITANTE';
}

class OpcaoDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiPropertyOptional({ nullable: true }) emoji?: string;
  @ApiPropertyOptional({ nullable: true }) destaque?: boolean;
}

/**
 * Próxima ação que o front deve renderizar. Espelha 1:1 o `ChatModo` do front:
 *  - opcoes: lista de botões
 *  - texto: campo de texto (nome/cpf/endereco/telefone)
 *  - nenhum: nada a fazer (conversa encerrada sem opções)
 */
class ProximaAcaoDto {
  @ApiProperty({ enum: ['opcoes', 'texto', 'nenhum'] })
  tipo!: 'opcoes' | 'texto' | 'nenhum';

  @ApiPropertyOptional({ type: [OpcaoDto], description: 'Quando tipo=opcoes.' })
  opcoes?: OpcaoDto[];

  @ApiPropertyOptional({
    enum: ['nome', 'cpf', 'endereco', 'telefone'],
    description: 'Quando tipo=texto.',
  })
  campo?: 'nome' | 'cpf' | 'endereco' | 'telefone';
}

export class PassoConversaResponseDto {
  @ApiProperty() conversaId!: string;

  @ApiProperty({ type: [MensagemSaidaDto], description: 'Falas do bot neste passo.' })
  mensagens!: MensagemSaidaDto[];

  @ApiProperty({ type: ProximaAcaoDto })
  proximaAcao!: ProximaAcaoDto;

  @ApiPropertyOptional({ nullable: true, description: 'Preenchido quando a solicitação é criada.' })
  protocolo?: string;

  @ApiProperty({ description: 'true quando a conversa foi encerrada.' })
  finalizada!: boolean;
}
