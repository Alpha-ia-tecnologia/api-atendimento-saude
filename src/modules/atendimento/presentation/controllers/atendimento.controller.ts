import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedMaria } from '../../../auth-maria/application/services/token-maria.service';
import { MariaUser } from '../../../auth-maria/presentation/decorators/maria-user.decorator';
import { JwtMariaGuard } from '../../../auth-maria/presentation/guards/jwt-maria.guard';
import { EnviarAcaoDto } from '../../application/dtos/enviar-acao.dto';
import { IniciarConversaDto } from '../../application/dtos/iniciar-conversa.dto';
import { PassoConversaResponseDto } from '../../application/dtos/passo-conversa-response.dto';
import { EnviarAcaoUseCase } from '../../application/use-cases/enviar-acao.use-case';
import { IniciarConversaUseCase } from '../../application/use-cases/iniciar-conversa.use-case';
import { ObterConversaUseCase } from '../../application/use-cases/obter-conversa.use-case';

@ApiTags('Atendimento (paciente)')
@ApiBearerAuth()
@UseGuards(JwtMariaGuard)
@Controller('conversas')
export class AtendimentoController {
  constructor(
    private readonly iniciar: IniciarConversaUseCase,
    private readonly enviar: EnviarAcaoUseCase,
    private readonly obter: ObterConversaUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inicia uma conversa conduzida pelo motor de fluxo.',
    description:
      'Cria a conversa para o solicitante logado e devolve o primeiro passo ' +
      '(falas do bot + próxima ação a renderizar).',
  })
  @ApiCreatedResponse({ type: PassoConversaResponseDto })
  async iniciarConversa(
    @MariaUser() user: AuthenticatedMaria,
    @Body() dto: IniciarConversaDto,
  ): Promise<PassoConversaResponseDto> {
    return this.iniciar.execute(user.usuarioMariaId, dto?.canal);
  }

  @Post(':id/mensagens')
  @ApiOperation({
    summary: 'Envia uma ação do solicitante e recebe o próximo passo.',
    description:
      'O motor valida a entrada, avança o fluxo, persiste as mensagens e — ao ' +
      'concluir — cria a Solicitacao, devolvendo o protocolo.',
  })
  @ApiOkResponse({ type: PassoConversaResponseDto })
  async enviarAcao(
    @MariaUser() user: AuthenticatedMaria,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnviarAcaoDto,
  ): Promise<PassoConversaResponseDto> {
    return this.enviar.execute(user.usuarioMariaId, id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retoma uma conversa (próxima ação esperada).' })
  @ApiOkResponse({ type: PassoConversaResponseDto })
  async obterConversa(
    @MariaUser() user: AuthenticatedMaria,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PassoConversaResponseDto> {
    return this.obter.execute(user.usuarioMariaId, id);
  }
}
