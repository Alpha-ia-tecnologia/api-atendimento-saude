import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { EspecialidadeResponseDto } from '../../application/dtos/especialidade-response.dto';
import { ListarEspecialidadesDto } from '../../application/dtos/listar-especialidades.dto';
import { ListarEspecialidadesUseCase } from '../../application/use-cases/listar-especialidades.use-case';
import { ObterEspecialidadeUseCase } from '../../application/use-cases/obter-especialidade.use-case';

@ApiTags('Especialidades')
@Controller('especialidades')
export class EspecialidadesController {
  constructor(
    private readonly listar: ListarEspecialidadesUseCase,
    private readonly obter: ObterEspecialidadeUseCase,
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

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma especialidade.' })
  @ApiOkResponse({ type: EspecialidadeResponseDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EspecialidadeResponseDto> {
    return this.obter.execute(id);
  }
}
