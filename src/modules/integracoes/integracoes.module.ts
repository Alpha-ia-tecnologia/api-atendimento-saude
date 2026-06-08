import { Module } from '@nestjs/common';

import { CryptoService } from '../../shared/crypto/crypto.service';
import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { IntegracoesController } from './presentation/controllers/integracoes.controller';
import { WhatsappTesterService } from './application/services/whatsapp-tester.service';
import { ObterIntegracoesUseCase } from './application/use-cases/obter-integracoes.use-case';
import { SalvarIntegracaoUseCase } from './application/use-cases/salvar-integracao.use-case';
import { TestarIntegracaoUseCase } from './application/use-cases/testar-integracao.use-case';
import { AtivarIntegracaoUseCase } from './application/use-cases/ativar-integracao.use-case';
import { ConectarEvolutionUseCase } from './application/use-cases/conectar-evolution.use-case';
import { EnviarTesteUseCase } from './application/use-cases/enviar-teste.use-case';
import { StatusCanalUseCase } from './application/use-cases/status-canal.use-case';

@Module({
  imports: [AuthCrmModule, WhatsappModule], // guards CRM + MESSAGING_PORT (envio de teste)
  controllers: [IntegracoesController],
  providers: [
    CryptoService,
    WhatsappTesterService,
    ObterIntegracoesUseCase,
    SalvarIntegracaoUseCase,
    TestarIntegracaoUseCase,
    AtivarIntegracaoUseCase,
    ConectarEvolutionUseCase,
    EnviarTesteUseCase,
    StatusCanalUseCase,
  ],
})
export class IntegracoesModule {}
