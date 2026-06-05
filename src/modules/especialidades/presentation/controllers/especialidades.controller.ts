import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PerfilCrm } from '../../../auth-crm/presentation/decorators/perfil-crm.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import { AtualizarEspecialidadeDto } from '../../application/dtos/atualizar-especialidade.dto';
import { CriarEspecialidadeDto } from '../../application/dtos/criar-especialidade.dto';
import { EspecialidadeResponseDto } from '../../application/dtos/especialidade-response.dto';
import { ListarEspecialidadesDto } from '../../application/dtos/listar-especialidades.dto';
import { AtualizarEspecialidadeUseCase } from '../../application/use-cases/atualizar-especialidade.use-case';
import { CriarEspecialidadeUseCase } from '../../application/use-cases/criar-especialidade.use-case';
import { ExcluirEspecialidadeUseCase } from '../../application/use-cases/excluir-especialidade.use-case';
import { ListarEspecialidadesUseCase } from '../../application/use-cases/listar-especialidades.use-case';
import { ObterEspecialidadeUseCase } from '../../application/use-cases/obter-especialidade.use-case';

@ApiTags('Especialidades')
@Controller('especialidades')
export class EspecialidadesController {
  constructor(
    private readonly listar: ListarEspecialidadesUseCase,
    private readonly obter: ObterEspecialidadeUseCase,
    private readonly criarUC: CriarEspecialidadeUseCase,
    private readonly atualizarUC: AtualizarEspecialidadeUseCase,
    private readonly excluirUC: ExcluirEspecialidadeUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista o catálogo de especialidades.',
    description:
      'Endpoint público. Por padrão devolve só as disponíveis. Filtros opcionais: tipo, disponivel.',
  })
  @ApiOkResponse({ type: [EspecialidadeResponseDto] })
  async list(@Query() filtros: ListarEspecialidadesDto): Promise<EspecialidadeResponseDto[]> {
    return this.listar.execute(filtros);
  }

  @Get('gerenciar')
  @UseGuards(JwtCrmGuard, PerfilGuard)
  @PerfilCrm('ADMIN', 'SUPERVISOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista TODAS as especialidades (inclui indisponíveis) para gestão.',
  })
  @ApiOkResponse({ type: [EspecialidadeResponseDto] })
  async listGerenciar(
    @Query() filtros: ListarEspecialidadesDto,
  ): Promise<EspecialidadeResponseDto[]> {
    // disponivel undefined → use-case devolve disponíveis E indisponíveis.
    return this.listar.execute({ tipo: filtros.tipo, disponivel: undefined });
  }

  @Post()
  @UseGuards(JwtCrmGuard, PerfilGuard)
  @PerfilCrm('ADMIN', 'SUPERVISOR')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma especialidade ou exame.' })
  @ApiOkResponse({ type: EspecialidadeResponseDto })
  async criar(@Body() dto: CriarEspecialidadeDto): Promise<EspecialidadeResponseDto> {
    return this.criarUC.execute(dto);
  }

  @Patch(':id')
  @UseGuards(JwtCrmGuard, PerfilGuard)
  @PerfilCrm('ADMIN', 'SUPERVISOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edita uma especialidade ou exame.' })
  @ApiOkResponse({ type: EspecialidadeResponseDto })
  async atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarEspecialidadeDto,
  ): Promise<EspecialidadeResponseDto> {
    return this.atualizarUC.execute(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtCrmGuard, PerfilGuard)
  @PerfilCrm('ADMIN', 'SUPERVISOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exclui uma especialidade (bloqueia se houver solicitações).' })
  async excluir(@Param('id', ParseUUIDPipe) id: string): Promise<{ ok: true }> {
    return this.excluirUC.execute(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma especialidade.' })
  @ApiOkResponse({ type: EspecialidadeResponseDto })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<EspecialidadeResponseDto> {
    return this.obter.execute(id);
  }
}
