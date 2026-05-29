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

import { CancelarSolicitacaoDto } from '../../application/dtos/cancelar-solicitacao.dto';
import { CriarSolicitacaoDto } from '../../application/dtos/criar-solicitacao.dto';
import { SolicitacaoResponseDto } from '../../application/dtos/solicitacao-response.dto';
import { CancelarSolicitacaoUseCase } from '../../application/use-cases/cancelar-solicitacao.use-case';
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
    private readonly cancelarUseCase: CancelarSolicitacaoUseCase,
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

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancela uma solicitação (só status SOLICITADA).',
    description:
      'O paciente cancela sua solicitação ainda em análise. ' +
      'Pode cancelar quem CRIOU (solicitante) OU quem é o paciente cadastrado ' +
      '(mesmo CPF do paciente bate com o CPF do usuário logado). ' +
      'Depois de AGENDADA/REALIZADA, devolve 409 — usa o CRM pra cancelar.',
  })
  @ApiOkResponse({ type: SolicitacaoResponseDto })
  async cancelar(
    @MariaUser() user: AuthenticatedMaria,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarSolicitacaoDto,
  ): Promise<SolicitacaoResponseDto> {
    return this.cancelarUseCase.execute(
      id,
      { usuarioMariaId: user.usuarioMariaId, cpf: user.cpf },
      dto.motivo,
    );
  }
}
