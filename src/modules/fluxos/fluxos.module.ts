import { Module } from '@nestjs/common';

import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { EspecialidadesModule } from '../especialidades/especialidades.module';
import { FluxosController } from './presentation/controllers/fluxos.controller';
import { ListarFluxosUseCase } from './application/use-cases/listar-fluxos.use-case';
import { ObterVersaoUseCase } from './application/use-cases/obter-versao.use-case';
import { CriarFluxoUseCase } from './application/use-cases/criar-fluxo.use-case';
import { CriarVersaoUseCase } from './application/use-cases/criar-versao.use-case';
import { MoverFluxoUseCase } from './application/use-cases/mover-fluxo.use-case';
import { SalvarRascunhoUseCase } from './application/use-cases/salvar-rascunho.use-case';
import { PublicarVersaoUseCase } from './application/use-cases/publicar-versao.use-case';
import { ValidarFluxoUseCase } from './application/use-cases/validar-fluxo.use-case';
import { ClonarCanalUseCase } from './application/use-cases/clonar-canal.use-case';
import { SimuladorFluxoService } from './application/services/simulador-fluxo.service';

@Module({
  imports: [AuthCrmModule, EspecialidadesModule], // guards + especialidades p/ o simulador
  controllers: [FluxosController],
  providers: [
    ListarFluxosUseCase,
    ObterVersaoUseCase,
    CriarFluxoUseCase,
    CriarVersaoUseCase,
    MoverFluxoUseCase,
    SalvarRascunhoUseCase,
    PublicarVersaoUseCase,
    ValidarFluxoUseCase,
    ClonarCanalUseCase,
    SimuladorFluxoService,
  ],
})
export class FluxosModule {}
