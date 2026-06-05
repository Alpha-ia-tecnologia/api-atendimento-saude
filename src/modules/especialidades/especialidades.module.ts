import { Module } from '@nestjs/common';

import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { AtualizarEspecialidadeUseCase } from './application/use-cases/atualizar-especialidade.use-case';
import { CriarEspecialidadeUseCase } from './application/use-cases/criar-especialidade.use-case';
import { ExcluirEspecialidadeUseCase } from './application/use-cases/excluir-especialidade.use-case';
import { ListarEspecialidadesUseCase } from './application/use-cases/listar-especialidades.use-case';
import { ObterEspecialidadeUseCase } from './application/use-cases/obter-especialidade.use-case';
import { EspecialidadesController } from './presentation/controllers/especialidades.controller';

@Module({
  imports: [AuthCrmModule], // JwtCrmGuard + PerfilGuard p/ as rotas de gestão
  controllers: [EspecialidadesController],
  providers: [
    ListarEspecialidadesUseCase,
    ObterEspecialidadeUseCase,
    CriarEspecialidadeUseCase,
    AtualizarEspecialidadeUseCase,
    ExcluirEspecialidadeUseCase,
  ],
  exports: [ListarEspecialidadesUseCase, ObterEspecialidadeUseCase],
})
export class EspecialidadesModule {}
