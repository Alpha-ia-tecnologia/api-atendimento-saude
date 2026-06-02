import { Module } from '@nestjs/common';

import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { EspecialidadesModule } from '../especialidades/especialidades.module';
import { SolicitacoesModule } from '../solicitacoes/solicitacoes.module';
import { AtendimentoController } from './presentation/controllers/atendimento.controller';
import { FlowEngineService } from './application/services/flow-engine.service';
import { IniciarConversaUseCase } from './application/use-cases/iniciar-conversa.use-case';
import { EnviarAcaoUseCase } from './application/use-cases/enviar-acao.use-case';
import { ObterConversaUseCase } from './application/use-cases/obter-conversa.use-case';

@Module({
  imports: [AuthMariaModule, EspecialidadesModule, SolicitacoesModule],
  controllers: [AtendimentoController],
  providers: [
    FlowEngineService,
    IniciarConversaUseCase,
    EnviarAcaoUseCase,
    ObterConversaUseCase,
  ],
})
export class AtendimentoModule {}
