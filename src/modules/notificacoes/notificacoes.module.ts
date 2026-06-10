import { Module } from '@nestjs/common';

import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { FilesModule } from '../files/files.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotificacoesController } from './presentation/controllers/notificacoes.controller';
import { ExpoPushService } from './application/services/expo-push.service';
import { NotificarSolicitacaoService } from './application/services/notificar-solicitacao.service';
import { ListarNotificacoesUseCase } from './application/use-cases/listar-notificacoes.use-case';
import { MarcarLidaUseCase } from './application/use-cases/marcar-lida.use-case';
import { RegistrarDeviceTokenUseCase } from './application/use-cases/registrar-device-token.use-case';
import { RemoverDeviceTokenUseCase } from './application/use-cases/remover-device-token.use-case';

/**
 * Notificações do ciclo de vida da Solicitação (H4.3/H6.3):
 * inbox in-app (canal PUSH) + push real no aparelho (Expo Push Service)
 * + envio pelo WhatsApp (MessagingPort).
 */
@Module({
  imports: [AuthMariaModule, WhatsappModule, FilesModule],
  controllers: [NotificacoesController],
  providers: [
    NotificarSolicitacaoService,
    ExpoPushService,
    ListarNotificacoesUseCase,
    MarcarLidaUseCase,
    RegistrarDeviceTokenUseCase,
    RemoverDeviceTokenUseCase,
  ],
  exports: [NotificarSolicitacaoService],
})
export class NotificacoesModule {}
