import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedCrm } from '../../../auth-crm/application/services/token-crm.service';
import { CrmUser } from '../../../auth-crm/presentation/decorators/crm-user.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import {
  ConversaDetalheDto,
  ConversaResumoDto,
} from '../../application/dtos/conversa-response.dto';
import { ListarConversasGestorDto } from '../../application/dtos/listar-conversas-gestor.dto';
import { ResponderConversaDto } from '../../application/dtos/responder-conversa.dto';
import { EncerrarConversaUseCase } from '../../application/use-cases/encerrar-conversa.use-case';
import { ListarConversasGestorUseCase } from '../../application/use-cases/listar-conversas-gestor.use-case';
import { ObterConversaGestorUseCase } from '../../application/use-cases/obter-conversa-gestor.use-case';
import { ResponderConversaUseCase } from '../../application/use-cases/responder-conversa.use-case';

@ApiTags('Conversas (gestor)')
@ApiBearerAuth()
@UseGuards(JwtCrmGuard, PerfilGuard)
@Controller('gestor/conversas')
export class GestorConversasController {
  constructor(
    private readonly listar: ListarConversasGestorUseCase,
    private readonly obter: ObterConversaGestorUseCase,
    private readonly responder: ResponderConversaUseCase,
    private readonly encerrar: EncerrarConversaUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Inbox: lista conversas (paginada, atividade mais recente primeiro).',
    description: 'Filtros: estado, canal e busca (nome/CPF do solicitante).',
  })
  async listarConversas(@Query() filtros: ListarConversasGestorDto) {
    return this.listar.execute(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma conversa com o histórico de mensagens.' })
  @ApiOkResponse({ type: ConversaDetalheDto })
  async detalhe(@Param('id', ParseUUIDPipe) id: string): Promise<ConversaDetalheDto> {
    return this.obter.execute(id);
  }

  @Post(':id/mensagens')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Responde o solicitante (mensagem do operador na conversa).' })
  @ApiOkResponse({ type: ConversaDetalheDto })
  async responderConversa(
    @Param('id', ParseUUIDPipe) id: string,
    @CrmUser() user: AuthenticatedCrm,
    @Body() dto: ResponderConversaDto,
  ): Promise<ConversaDetalheDto> {
    return this.responder.execute(id, user.usuarioCrmId, dto.conteudo);
  }

  @Post(':id/encerrar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra a conversa.' })
  @ApiOkResponse({ type: ConversaDetalheDto })
  async encerrarConversa(
    @Param('id', ParseUUIDPipe) id: string,
    @CrmUser() user: AuthenticatedCrm,
  ): Promise<ConversaDetalheDto> {
    return this.encerrar.execute(id, user.usuarioCrmId);
  }
}
