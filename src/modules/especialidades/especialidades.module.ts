import { Module } from '@nestjs/common';

import { ListarEspecialidadesUseCase } from './application/use-cases/listar-especialidades.use-case';
import { ObterEspecialidadeUseCase } from './application/use-cases/obter-especialidade.use-case';
import { EspecialidadesController } from './presentation/controllers/especialidades.controller';

@Module({
  controllers: [EspecialidadesController],
  providers: [ListarEspecialidadesUseCase, ObterEspecialidadeUseCase],
  exports: [ListarEspecialidadesUseCase, ObterEspecialidadeUseCase],
})
export class EspecialidadesModule {}
