import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { validateEnv } from './shared/config/env.validation';
import { SharedModule } from './shared/shared.module';
import { AuthMariaModule } from './modules/auth-maria/auth-maria.module';
import { EspecialidadesModule } from './modules/especialidades/especialidades.module';
import { SolicitacoesModule } from './modules/solicitacoes/solicitacoes.module';
import { UploadsModule } from './modules/uploads/uploads.module';

// NOTE: módulos do CRM (auth, users, organizations, roles, permissions, audit)
// foram escritos pra um schema anterior em camelCase inglês. Estão desabilitados
// até serem refatorados pro schema atual em Portuguese snake_case.

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    SharedModule,
    AuthMariaModule,
    EspecialidadesModule,
    SolicitacoesModule,
    UploadsModule,
  ],
})
export class AppModule {}
