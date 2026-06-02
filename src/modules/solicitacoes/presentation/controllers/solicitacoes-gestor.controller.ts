import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { MinioService } from '../../../files/application/services/minio.service';
import type { AuthenticatedCrm } from '../../../auth-crm/application/services/token-crm.service';
import { CrmUser } from '../../../auth-crm/presentation/decorators/crm-user.decorator';
import { JwtCrmGuard } from '../../../auth-crm/presentation/guards/jwt-crm.guard';
import { PerfilGuard } from '../../../auth-crm/presentation/guards/perfil.guard';
import { AprovarSolicitacaoDto } from '../../application/dtos/aprovar-solicitacao.dto';
import { ListarSolicitacoesGestorDto } from '../../application/dtos/listar-solicitacoes-gestor.dto';
import { RecusarSolicitacaoDto } from '../../application/dtos/recusar-solicitacao.dto';
import { SolicitacaoResponseDto } from '../../application/dtos/solicitacao-response.dto';
import { AprovarSolicitacaoUseCase } from '../../application/use-cases/aprovar-solicitacao.use-case';
import { AssumirSolicitacaoUseCase } from '../../application/use-cases/assumir-solicitacao.use-case';
import { ListarSolicitacoesGestorUseCase } from '../../application/use-cases/listar-solicitacoes-gestor.use-case';
import { ObterSolicitacaoGestorUseCase } from '../../application/use-cases/obter-solicitacao-gestor.use-case';
import { RecusarSolicitacaoUseCase } from '../../application/use-cases/recusar-solicitacao.use-case';

const MAX_PDF = 8 * 1024 * 1024; // 8 MB

@ApiTags('Solicitações (gestor)')
@ApiBearerAuth()
@UseGuards(JwtCrmGuard, PerfilGuard)
@Controller('gestor/solicitacoes')
export class SolicitacoesGestorController {
  constructor(
    private readonly listar: ListarSolicitacoesGestorUseCase,
    private readonly obter: ObterSolicitacaoGestorUseCase,
    private readonly assumir: AssumirSolicitacaoUseCase,
    private readonly aprovar: AprovarSolicitacaoUseCase,
    private readonly recusar: RecusarSolicitacaoUseCase,
    private readonly minio: MinioService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Fila de solicitações (paginada, FIFO).',
    description:
      'Lista as solicitações para o operador, mais antigas primeiro. Filtros: ' +
      'status, especialidade, origem, período (de/ate) e busca (nome/CPF/protocolo).',
  })
  async listarFila(@Query() filtros: ListarSolicitacoesGestorDto) {
    return this.listar.execute(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma solicitação (para o gestor).' })
  @ApiOkResponse({ type: SolicitacaoResponseDto })
  async detalhe(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SolicitacaoResponseDto> {
    return this.obter.execute(id);
  }

  @Post(':id/assumir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assume o atendimento (Solicitada → Em atendimento).' })
  @ApiOkResponse({ type: SolicitacaoResponseDto })
  async assumirAtendimento(
    @Param('id', ParseUUIDPipe) id: string,
    @CrmUser() user: AuthenticatedCrm,
  ): Promise<SolicitacaoResponseDto> {
    return this.assumir.execute(id, user.usuarioCrmId);
  }

  @Post(':id/aprovar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprova/agenda (Em atendimento → Agendada), anexando o PDF do SISREG.',
    description: 'Recebe o PDF em multipart (campo `file`, obrigatório, ≤ 8 MB).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        dataAgendada: { type: 'string', format: 'date-time' },
      },
      required: ['file', 'dataAgendada'],
    },
  })
  @ApiOkResponse({ type: SolicitacaoResponseDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF } }))
  async aprovarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @CrmUser() user: AuthenticatedCrm,
    @Body() dto: AprovarSolicitacaoDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PDF }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<SolicitacaoResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('PDF do agendamento não recebido.');
    }
    const { url } = await this.minio.upload({
      prefixo: 'comprovantes',
      proprietarioId: user.usuarioCrmId,
      arquivo: file.buffer,
      nomeOriginal: file.originalname,
      mimeType: file.mimetype,
    });
    return this.aprovar.execute(id, user.usuarioCrmId, {
      pdfUrl: url,
      dataAgendada: new Date(dto.dataAgendada),
    });
  }

  @Post(':id/recusar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recusa (Em atendimento → Não aprovada), com motivo.' })
  @ApiOkResponse({ type: SolicitacaoResponseDto })
  async recusarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @CrmUser() user: AuthenticatedCrm,
    @Body() dto: RecusarSolicitacaoDto,
  ): Promise<SolicitacaoResponseDto> {
    return this.recusar.execute(id, user.usuarioCrmId, dto.motivo);
  }
}
