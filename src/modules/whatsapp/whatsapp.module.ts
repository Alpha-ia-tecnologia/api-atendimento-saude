import { Module } from '@nestjs/common';

import { CryptoService } from '../../shared/crypto/crypto.service';
import { FilesModule } from '../files/files.module';
import { MESSAGING_PORT } from './domain/ports/messaging.port';
import { MessagingService } from './application/services/messaging.service';
import { EvolutionAdapter } from './infrastructure/adapters/evolution.adapter';
import { MetaCloudAdapter } from './infrastructure/adapters/meta-cloud.adapter';

/**
 * Mensageria de WhatsApp (doc 06): porta + adapters Evolution/Meta.
 * Quem consome injeta `MESSAGING_PORT` (ex.: webhook do atendimento e o
 * espelhamento da resposta do gestor no Inbox).
 */
@Module({
  imports: [FilesModule],
  providers: [
    CryptoService,
    EvolutionAdapter,
    MetaCloudAdapter,
    { provide: MESSAGING_PORT, useClass: MessagingService },
  ],
  exports: [MESSAGING_PORT],
})
export class WhatsappModule {}
