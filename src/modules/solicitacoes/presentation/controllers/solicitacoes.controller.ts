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

import { CriarSolicitacaoDto } from '../../application/dtos/criar-solicitacao.dto';
import { SolicitacaoResponseDto } from '../../application/dtos/solicitacao-response.dto';
import { CriarSolicitacaoUseCase } from '../../application/use-cases/criar-solicitacao.use-case';
import { ListarMinhasSolicitacoesUseCase } from '../../application/use-cases/listar-minhas-solicitacoes.use-case';
import { ObterSolicitacaoUseCase } from '../../application/use-cases/obter-solicitacao.use-case';
import type { AuthenticatedMaria } from '../../../auth-maria/application/services/token-maria.service';
import { MariaUser } from '../../../auth-maria/presentation/decorators/maria-user.decorator';
import { JwtMariaGuard } from '../../../auth-maria/presentation/guards/jwt-maria.guard';

@ApiTags('Solicitações (paciente)')
@ApiBearerAuth()
@UseGuards(JwtMariaGuard)
@Controller('solicitacoes')
export class SolicitacoesController {
  constructor(
    private readonly criar: CriarSolicitacaoUseCase,
    private readonly listar: ListarMinhasSolicitacoesUseCase,
    private readonly obter: ObterSolicitacaoUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria uma solicitação de consulta/exame.',
    description:
      'O backend gera o protocolo e devolve. ' +
      'Quando paraQuem=EU, os dados do paciente são snapshot do UsuarioMaria ' +
      'logado (qualquer `paciente` no payload é ignorado por segurança). ' +
      'Quando paraQuem=OUTRA, os dados vêm do payload e o paciente NÃO ' +
      'precisa ter conta no app.',
  })
  @ApiCreatedResponse({ type: SolicitacaoResponseDto })
  async create(
    @MariaUser() user: AuthenticatedMaria,
    @Body() dto: CriarSolicitacaoDto,
  ): Promise<SolicitacaoResponseDto> {
    return this.criar.execute(user.usuarioMariaId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista as solicitações que EU criei (em qualquer status).',
  })
  @ApiOkResponse({ type: [SolicitacaoResponseDto] })
  async list(
    @MariaUser() user: AuthenticatedMaria,
  ): Promise<SolicitacaoResponseDto[]> {
    return this.listar.execute(user.usuarioMariaId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de uma solicitação minha.',
    description: '404 se a solicitação não existir OU não pertencer a mim.',
  })
  @ApiOkResponse({ type: SolicitacaoResponseDto })
  async getById(
    @MariaUser() user: AuthenticatedMaria,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SolicitacaoResponseDto> {
    return this.obter.execute(user.usuarioMariaId, id);
  }
}
