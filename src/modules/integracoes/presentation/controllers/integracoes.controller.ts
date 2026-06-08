import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProvedorCanal } from '@prisma/client';

import type { AuthenticatedCrm } from '../../../auth-crm/application/services/token-crm.service';
import { CrmUser } from '../../../auth-crm/presentation/decorators/crm-user.decorator';
import { PerfilCrm } from '../../../auth-crm/presentation/decorators/perfil-crm.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import { AtivarProvedorDto } from '../../application/dtos/ativar-provedor.dto';
import { EnviarTesteDto } from '../../application/dtos/enviar-teste.dto';
import { SalvarEvolutionDto } from '../../application/dtos/salvar-evolution.dto';
import { SalvarMetaDto } from '../../application/dtos/salvar-meta.dto';
import { AtivarIntegracaoUseCase } from '../../application/use-cases/ativar-integracao.use-case';
import { ConectarEvolutionUseCase } from '../../application/use-cases/conectar-evolution.use-case';
import { EnviarTesteUseCase } from '../../application/use-cases/enviar-teste.use-case';
import { ObterIntegracoesUseCase } from '../../application/use-cases/obter-integracoes.use-case';
import { SalvarIntegracaoUseCase } from '../../application/use-cases/salvar-integracao.use-case';
import { StatusCanalUseCase } from '../../application/use-cases/status-canal.use-case';
import { TestarIntegracaoUseCase } from '../../application/use-cases/testar-integracao.use-case';

/**
 * Tela de Integrações de WhatsApp (CRM). Só ADMIN — os segredos nunca voltam
 * em texto puro (apenas mascarados pelo ObterIntegracoesUseCase).
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
    private readonly statusCanal: StatusCanalUseCase,
    private readonly enviarTeste: EnviarTesteUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Estado e config dos provedores (segredos mascarados).' })
  async obterEstado() {
    return this.obter.execute();
  }

  @Get('status')
  @ApiOperation({ summary: 'Status do canal: verifica o provedor ativo agora.' })
  async status() {
    return this.statusCanal.execute();
  }

  @Post('conectar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evolution: gera o QR Code / pareia a instância.' })
  async conectarEvolution() {
    return this.conectar.execute();
  }

  @Put('evolution')
  @ApiOperation({ summary: 'Salva as credenciais do provedor Evolution.' })
  async salvarEvolution(@Body() dto: SalvarEvolutionDto, @CrmUser() user: AuthenticatedCrm) {
    await this.salvar.salvarEvolution(dto, user.usuarioCrmId);
    return this.obter.execute();
  }

  @Put('meta')
  @ApiOperation({ summary: 'Salva as credenciais do provedor Meta Cloud.' })
  async salvarMeta(@Body() dto: SalvarMetaDto, @CrmUser() user: AuthenticatedCrm) {
    await this.salvar.salvarMeta(dto, user.usuarioCrmId);
    return this.obter.execute();
  }

  @Post(':provedor/testar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testa a conexão com o provedor (chamada real).' })
  async testarProvedor(@Param('provedor') provedor: string) {
    return this.testar.execute(this.normalizarProvedor(provedor));
  }

  @Post('ativar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Define o provedor ativo.' })
  async ativarProvedor(@Body() dto: AtivarProvedorDto) {
    await this.ativar.execute(dto.provedor);
    return this.obter.execute();
  }

  @Post('enviar-teste')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia uma mensagem de teste pelo provedor ativo (envio real).' })
  async enviarTesteMensagem(@Body() dto: EnviarTesteDto) {
    return this.enviarTeste.execute(dto.numero);
  }

  private normalizarProvedor(valor: string): ProvedorCanal {
    const v = valor?.toUpperCase();
    if (v === ProvedorCanal.EVOLUTION || v === ProvedorCanal.META) {
      return v as ProvedorCanal;
    }
    throw new BadRequestException('Provedor inválido (use evolution ou meta).');
  }
}
