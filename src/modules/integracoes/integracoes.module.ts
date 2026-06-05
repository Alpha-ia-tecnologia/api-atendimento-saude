import { Module } from '@nestjs/common';

import { CryptoService } from '../../shared/crypto/crypto.service';
import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { IntegracoesController } from './presentation/controllers/integracoes.controller';
import { WhatsappTesterService } from './application/services/whatsapp-tester.service';
import { ObterIntegracoesUseCase } from './application/use-cases/obter-integracoes.use-case';
import { SalvarIntegracaoUseCase } from './application/use-cases/salvar-integracao.use-case';
import { TestarIntegracaoUseCase } from './application/use-cases/testar-integracao.use-case';
import { AtivarIntegracaoUseCase } from './application/use-cases/ativar-integracao.use-case';
import { ConectarEvolutionUseCase } from './application/use-cases/conectar-evolution.use-case';
import { StatusCanalUseCase } from './application/use-cases/status-canal.use-case';

@Module({
  imports: [AuthCrmModule], // JwtCrmGuard + PerfilGuard
  controllers: [IntegracoesController],
  providers: [
    CryptoService,
    WhatsappTesterService,
    ObterIntegracoesUseCase,
    SalvarIntegracaoUseCase,
    TestarIntegracaoUseCase,
    AtivarIntegracaoUseCase,
    ConectarEvolutionUseCase,
    StatusCanalUseCase,
  ],
})
export class IntegracoesModule {}
