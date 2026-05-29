import { Module } from '@nestjs/common';

import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { FilesModule } from '../files/files.module';
import { ProtocoloService } from './application/services/protocolo.service';
import { CriarSolicitacaoUseCase } from './application/use-cases/criar-solicitacao.use-case';
import { ListarMinhasSolicitacoesUseCase } from './application/use-cases/listar-minhas-solicitacoes.use-case';
import { ObterSolicitacaoUseCase } from './application/use-cases/obter-solicitacao.use-case';
import { SolicitacoesController } from './presentation/controllers/solicitacoes.controller';

@Module({
  imports: [AuthMariaModule, FilesModule], // JwtMariaGuard + MinioService
  controllers: [SolicitacoesController],
  providers: [
    ProtocoloService,
    CriarSolicitacaoUseCase,
    ListarMinhasSolicitacoesUseCase,
    ObterSolicitacaoUseCase,
  ],
})
export class SolicitacoesModule {}
