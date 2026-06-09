import { Module } from '@nestjs/common';

import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { EspecialidadesModule } from '../especialidades/especialidades.module';
import { FilesModule } from '../files/files.module';
import { SolicitacoesModule } from '../solicitacoes/solicitacoes.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AtendimentoController } from './presentation/controllers/atendimento.controller';
import { GestorConversasController } from './presentation/controllers/gestor-conversas.controller';
import { WebhookWhatsappController } from './presentation/controllers/webhook-whatsapp.controller';
import { ExpirarConversasService } from './application/services/expirar-conversas.service';
import { FlowEngineService } from './application/services/flow-engine.service';
import { FluxoResolverService } from './application/services/fluxo-resolver.service';
import { OcrEncaminhamentoService } from './application/services/ocr-encaminhamento.service';
import { IniciarConversaUseCase } from './application/use-cases/iniciar-conversa.use-case';
import { EnviarAcaoUseCase } from './application/use-cases/enviar-acao.use-case';
import { ObterConversaUseCase } from './application/use-cases/obter-conversa.use-case';
import { ListarConversasGestorUseCase } from './application/use-cases/listar-conversas-gestor.use-case';
import { ObterConversaGestorUseCase } from './application/use-cases/obter-conversa-gestor.use-case';
import { ResponderConversaUseCase } from './application/use-cases/responder-conversa.use-case';
import { EncerrarConversaUseCase } from './application/use-cases/encerrar-conversa.use-case';
import { ProcessarWebhookWhatsappUseCase } from './application/use-cases/processar-webhook-whatsapp.use-case';

@Module({
  imports: [
    AuthMariaModule,
    AuthCrmModule, // JwtCrmGuard + PerfilGuard pro Inbox do gestor
    EspecialidadesModule,
    SolicitacoesModule,
    FilesModule,
    WhatsappModule, // MESSAGING_PORT (webhook + espelhamento do gestor)
  ],
  controllers: [AtendimentoController, GestorConversasController, WebhookWhatsappController],
  providers: [
    ExpirarConversasService,
    FlowEngineService,
    FluxoResolverService,
    OcrEncaminhamentoService,
    IniciarConversaUseCase,
    EnviarAcaoUseCase,
    ObterConversaUseCase,
    ListarConversasGestorUseCase,
    ObterConversaGestorUseCase,
    ResponderConversaUseCase,
    EncerrarConversaUseCase,
    ProcessarWebhookWhatsappUseCase,
  ],
})
export class AtendimentoModule {}
