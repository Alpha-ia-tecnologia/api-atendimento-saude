import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { validateEnv } from './shared/config/env.validation';
import { SharedModule } from './shared/shared.module';
import { AuthMariaModule } from './modules/auth-maria/auth-maria.module';

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
  ],
})
export class AppModule {}
