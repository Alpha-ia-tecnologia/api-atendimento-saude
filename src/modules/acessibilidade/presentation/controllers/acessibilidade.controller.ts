import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedMaria } from '../../../auth-maria/application/services/token-maria.service';
import { MariaUser } from '../../../auth-maria/presentation/decorators/maria-user.decorator';
import { JwtMariaGuard } from '../../../auth-maria/presentation/guards/jwt-maria.guard';
import { AcessibilidadeResponseDto } from '../../application/dtos/acessibilidade-response.dto';
import { AtualizarAcessibilidadeDto } from '../../application/dtos/atualizar-acessibilidade.dto';
import { AtualizarAcessibilidadeUseCase } from '../../application/use-cases/atualizar-acessibilidade.use-case';
import { ObterAcessibilidadeUseCase } from '../../application/use-cases/obter-acessibilidade.use-case';

@ApiTags('Acessibilidade (paciente)')
@ApiBearerAuth()
@UseGuards(JwtMariaGuard)
@Controller('auth/maria/me/acessibilidade')
export class AcessibilidadeController {
  constructor(
    private readonly obter: ObterAcessibilidadeUseCase,
    private readonly atualizar: AtualizarAcessibilidadeUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Pega as preferências de acessibilidade do paciente.',
    description:
      'Retorna defaults se o registro ainda não existir. ' +
      'O tema (claro/escuro/sistema) é mantido só no dispositivo — aqui ' +
      'cuidamos só de escala de fonte, alto contraste e narração.',
  })
  @ApiOkResponse({ type: AcessibilidadeResponseDto })
  async get(
    @MariaUser() user: AuthenticatedMaria,
  ): Promise<AcessibilidadeResponseDto> {
    return this.obter.execute(user.usuarioMariaId);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualiza preferências do paciente.',
    description:
      'PATCH parcial — só atualiza campos que vierem no body. ' +
      'Faz upsert pra criar o registro caso ainda não exista.',
  })
  @ApiOkResponse({ type: AcessibilidadeResponseDto })
  async patch(
    @MariaUser() user: AuthenticatedMaria,
    @Body() dto: AtualizarAcessibilidadeDto,
  ): Promise<AcessibilidadeResponseDto> {
    return this.atualizar.execute(user.usuarioMariaId, dto);
  }
}
