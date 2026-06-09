import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedCrm } from '../../../auth-crm/application/services/token-crm.service';
import { CrmUser } from '../../../auth-crm/presentation/decorators/crm-user.decorator';
import { PerfilCrm } from '../../../auth-crm/presentation/decorators/perfil-crm.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import { CriarInstanciaDto } from '../../application/dtos/criar-instancia.dto';
import { EditarInstanciaDto } from '../../application/dtos/editar-instancia.dto';
import { EnviarTesteDto } from '../../application/dtos/enviar-teste.dto';
import { AtivarIntegracaoUseCase } from '../../application/use-cases/ativar-integracao.use-case';
import { ConectarEvolutionUseCase } from '../../application/use-cases/conectar-evolution.use-case';
import { EnviarTesteUseCase } from '../../application/use-cases/enviar-teste.use-case';
import { ExcluirInstanciaUseCase } from '../../application/use-cases/excluir-instancia.use-case';
import { ObterIntegracoesUseCase } from '../../application/use-cases/obter-integracoes.use-case';
import { SalvarIntegracaoUseCase } from '../../application/use-cases/salvar-integracao.use-case';
import { StatusCanalUseCase } from '../../application/use-cases/status-canal.use-case';
import { TestarIntegracaoUseCase } from '../../application/use-cases/testar-integracao.use-case';

/**
 * Tela de Integrações de WhatsApp (CRM). Só ADMIN — os segredos nunca voltam
 * em texto puro (apenas mascarados pelo ObterIntegracoesUseCase). Suporta
 * VÁRIAS instâncias por provedor (Evolution e Meta), com uma marcada padrão.
 */
@ApiTags('Integrações (WhatsApp)')
@ApiBearerAuth()
@UseGuards(JwtCrmGuard, PerfilGuard)
@PerfilCrm('ADMIN')
@Controller('integracoes/whatsapp')
export class IntegracoesController {
  constructor(
    private readonly obter: ObterIntegracoesUseCase,
    private readonly salvar: SalvarIntegracaoUseCase,
    private readonly testar: TestarIntegracaoUseCase,
    private readonly ativar: AtivarIntegracaoUseCase,
    private readonly conectar: ConectarEvolutionUseCase,
    private readonly excluir: ExcluirInstanciaUseCase,
    private readonly statusCanal: StatusCanalUseCase,
    private readonly enviarTeste: EnviarTesteUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista as instâncias (segredos mascarados).' })
  async obterEstado() {
    return this.obter.execute();
  }

  @Get('status')
  @ApiOperation({ summary: 'Status do canal: verifica a instância padrão agora.' })
  async status() {
    return this.statusCanal.execute();
  }

  @Post('instancias')
  @ApiOperation({ summary: 'Cria uma instância (Evolution ou Meta).' })
  async criarInstancia(@Body() dto: CriarInstanciaDto, @CrmUser() user: AuthenticatedCrm) {
    await this.salvar.criar(dto, user.usuarioCrmId);
    return this.obter.execute();
  }

  @Put('instancias/:id')
  @ApiOperation({ summary: 'Edita as credenciais/nome de uma instância.' })
  async editarInstancia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarInstanciaDto,
    @CrmUser() user: AuthenticatedCrm,
  ) {
    await this.salvar.editar(id, dto, user.usuarioCrmId);
    return this.obter.execute();
  }

  @Delete('instancias/:id')
  @ApiOperation({ summary: 'Exclui uma instância.' })
  async excluirInstancia(
    @Param('id', ParseUUIDPipe) id: string,
    @CrmUser() user: AuthenticatedCrm,
  ) {
    await this.excluir.execute(id, user.usuarioCrmId);
    return this.obter.execute();
  }

  @Post('instancias/:id/testar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testa a conexão da instância (chamada real).' })
  async testarInstancia(@Param('id', ParseUUIDPipe) id: string) {
    return this.testar.execute(id);
  }

  @Post('instancias/:id/conectar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evolution: gera o QR Code / pareia a instância.' })
  async conectarInstancia(@Param('id', ParseUUIDPipe) id: string) {
    return this.conectar.execute(id);
  }

  @Post('instancias/:id/padrao')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Define a instância como padrão global.' })
  async definirPadrao(@Param('id', ParseUUIDPipe) id: string, @CrmUser() user: AuthenticatedCrm) {
    await this.ativar.execute(id, user.usuarioCrmId);
    return this.obter.execute();
  }

  @Post('enviar-teste')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia uma mensagem de teste (envio real) por uma instância.' })
  async enviarTesteMensagem(@Body() dto: EnviarTesteDto) {
    return this.enviarTeste.execute(dto.numero, dto.instanciaId);
  }
}
