import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
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
import { CriarFluxoDto } from '../../application/dtos/criar-fluxo.dto';
import { CriarVersaoDto } from '../../application/dtos/criar-versao.dto';
import { MoverFluxoDto } from '../../application/dtos/mover-fluxo.dto';
import { SalvarRascunhoDto } from '../../application/dtos/salvar-rascunho.dto';
import { SimularDto } from '../../application/dtos/simular.dto';
import { CriarFluxoUseCase } from '../../application/use-cases/criar-fluxo.use-case';
import { CriarVersaoUseCase } from '../../application/use-cases/criar-versao.use-case';
import { ListarFluxosUseCase } from '../../application/use-cases/listar-fluxos.use-case';
import { MoverFluxoUseCase } from '../../application/use-cases/mover-fluxo.use-case';
import { ObterVersaoUseCase } from '../../application/use-cases/obter-versao.use-case';
import { PublicarVersaoUseCase } from '../../application/use-cases/publicar-versao.use-case';
import { SalvarRascunhoUseCase } from '../../application/use-cases/salvar-rascunho.use-case';
import { SimuladorFluxoService } from '../../application/services/simulador-fluxo.service';

@ApiTags('Fluxos (editor)')
@ApiBearerAuth()
@UseGuards(JwtCrmGuard, PerfilGuard)
@PerfilCrm('ADMIN', 'SUPERVISOR')
@Controller('fluxos')
export class FluxosController {
  constructor(
    private readonly listar: ListarFluxosUseCase,
    private readonly obter: ObterVersaoUseCase,
    private readonly criarFluxo: CriarFluxoUseCase,
    private readonly criarVersao: CriarVersaoUseCase,
    private readonly mover: MoverFluxoUseCase,
    private readonly salvar: SalvarRascunhoUseCase,
    private readonly publicar: PublicarVersaoUseCase,
    private readonly simulador: SimuladorFluxoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os fluxos e suas versões.' })
  async listarFluxos() {
    return this.listar.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria um fluxo novo (com a versão #1 só com o nó INICIO).' })
  async criarNovoFluxo(@CrmUser() user: AuthenticatedCrm, @Body() dto: CriarFluxoDto) {
    return this.criarFluxo.execute(dto, user.usuarioCrmId);
  }

  @Patch(':id/posicao')
  @ApiOperation({ summary: 'Salva a posição do card do fluxo no quadro.' })
  async moverFluxo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoverFluxoDto) {
    return this.mover.execute(id, dto);
  }

  @Get(':id/versoes/:numero')
  @ApiOperation({ summary: 'Grafo completo de uma versão (nós + arestas + variáveis).' })
  async obterVersao(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('numero', ParseIntPipe) numero: number,
  ) {
    return this.obter.execute(id, numero);
  }

  @Post(':id/versoes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria um RASCUNHO: do zero (só INICIO) ou clonando uma versão.' })
  async criar(
    @Param('id', ParseUUIDPipe) id: string,
    @CrmUser() user: AuthenticatedCrm,
    @Body() dto: CriarVersaoDto,
  ) {
    return this.criarVersao.execute(id, user.usuarioCrmId, {
      modo: dto.modo,
      baseNumero: dto.baseNumero,
    });
  }

  @Put(':id/versoes/:numero')
  @ApiOperation({ summary: 'Salva o rascunho (substitui nós/arestas/variáveis).' })
  async salvarRascunho(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('numero', ParseIntPipe) numero: number,
    @Body() dto: SalvarRascunhoDto,
  ) {
    return this.salvar.execute(id, numero, dto);
  }

  @Post(':id/versoes/:numero/simular')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simula a conversa do fluxo (dry-run, não cria nada).' })
  async simular(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('numero', ParseIntPipe) numero: number,
    @Body() dto: SimularDto,
  ) {
    return this.simulador.simular(id, numero, {
      noAtual: dto.noAtual,
      variaveis: dto.variaveis,
      acao: dto.acao,
    });
  }

  @Post(':id/versoes/:numero/publicar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valida e publica a versão (arquiva a publicada anterior).' })
  async publicarVersao(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('numero', ParseIntPipe) numero: number,
    @CrmUser() user: AuthenticatedCrm,
  ) {
    return this.publicar.execute(id, numero, user.usuarioCrmId);
  }
}
