import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedMaria } from '../../../auth-maria/application/services/token-maria.service';
import { MariaUser } from '../../../auth-maria/presentation/decorators/maria-user.decorator';
import { JwtMariaGuard } from '../../../auth-maria/presentation/guards/jwt-maria.guard';
import { DeviceTokenDto, RemoverDeviceTokenDto } from '../../application/dtos/device-token.dto';
import { NotificacaoResponseDto } from '../../application/dtos/notificacao-response.dto';
import { ListarNotificacoesUseCase } from '../../application/use-cases/listar-notificacoes.use-case';
import { MarcarLidaUseCase } from '../../application/use-cases/marcar-lida.use-case';
import { RegistrarDeviceTokenUseCase } from '../../application/use-cases/registrar-device-token.use-case';
import { RemoverDeviceTokenUseCase } from '../../application/use-cases/remover-device-token.use-case';

@ApiTags('Notificações (paciente)')
@ApiBearerAuth()
@UseGuards(JwtMariaGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor(
    private readonly listar: ListarNotificacoesUseCase,
    private readonly marcarLida: MarcarLidaUseCase,
    private readonly registrarToken: RegistrarDeviceTokenUseCase,
    private readonly removerToken: RemoverDeviceTokenUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Inbox de notificações do solicitante (mais recente primeiro).' })
  @ApiOkResponse({ type: [NotificacaoResponseDto] })
  async listarMinhas(
    @MariaUser() user: AuthenticatedMaria,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.listar.execute(user.usuarioMariaId, page, limit);
  }

  @Post('device-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra o Expo Push Token do aparelho (push real).' })
  async registrarDeviceToken(
    @MariaUser() user: AuthenticatedMaria,
    @Body() dto: DeviceTokenDto,
  ) {
    return this.registrarToken.execute(user.usuarioMariaId, dto.token, dto.plataforma);
  }

  @Delete('device-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove o Expo Push Token do aparelho (logout).' })
  async removerDeviceToken(
    @MariaUser() user: AuthenticatedMaria,
    @Body() dto: RemoverDeviceTokenDto,
  ) {
    return this.removerToken.execute(user.usuarioMariaId, dto.token);
  }

  @Post(':id/lida')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca a notificação como lida.' })
  async marcar(
    @MariaUser() user: AuthenticatedMaria,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marcarLida.execute(user.usuarioMariaId, id);
  }
}
