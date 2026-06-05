import { Module } from '@nestjs/common';

import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { FilesModule } from '../files/files.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ProtocoloService } from './application/services/protocolo.service';
import { CancelarSolicitacaoUseCase } from './application/use-cases/cancelar-solicitacao.use-case';
import { CriarSolicitacaoUseCase } from './application/use-cases/criar-solicitacao.use-case';
import { AprovarSolicitacaoUseCase } from './application/use-cases/aprovar-solicitacao.use-case';
import { AssumirSolicitacaoUseCase } from './application/use-cases/assumir-solicitacao.use-case';
import { ListarMinhasSolicitacoesUseCase } from './application/use-cases/listar-minhas-solicitacoes.use-case';
import { ListarSolicitacoesGestorUseCase } from './application/use-cases/listar-solicitacoes-gestor.use-case';
import { ObterSolicitacaoGestorUseCase } from './application/use-cases/obter-solicitacao-gestor.use-case';
import { ObterSolicitacaoUseCase } from './application/use-cases/obter-solicitacao.use-case';
import { RecusarSolicitacaoUseCase } from './application/use-cases/recusar-solicitacao.use-case';
import { SolicitacoesController } from './presentation/controllers/solicitacoes.controller';
import { SolicitacoesGestorController } from './presentation/controllers/solicitacoes-gestor.controller';

@Module({
  // JwtMariaGuard + JwtCrmGuard + MinioService + NotificarSolicitacaoService
  imports: [AuthMariaModule, AuthCrmModule, FilesModule, NotificacoesModule],
  controllers: [SolicitacoesController, SolicitacoesGestorController],
  providers: [
    ProtocoloService,
    CriarSolicitacaoUseCase,
    ListarMinhasSolicitacoesUseCase,
    ListarSolicitacoesGestorUseCase,
    ObterSolicitacaoGestorUseCase,
    ObterSolicitacaoUseCase,
    CancelarSolicitacaoUseCase,
    AssumirSolicitacaoUseCase,
    AprovarSolicitacaoUseCase,
    RecusarSolicitacaoUseCase,
  ],
  // Exportado para o motor de fluxo (módulo atendimento) reusar a criação.
  exports: [CriarSolicitacaoUseCase],
})
export class SolicitacoesModule {}
