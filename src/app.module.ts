import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { validateEnv } from './shared/config/env.validation';
import { SharedModule } from './shared/shared.module';
import { AcessibilidadeModule } from './modules/acessibilidade/acessibilidade.module';
import { AtendimentoModule } from './modules/atendimento/atendimento.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthCrmModule } from './modules/auth-crm/auth-crm.module';
import { AuthMariaModule } from './modules/auth-maria/auth-maria.module';
import { EspecialidadesModule } from './modules/especialidades/especialidades.module';
import { FluxosModule } from './modules/fluxos/fluxos.module';
import { IntegracoesModule } from './modules/integracoes/integracoes.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { SolicitacoesModule } from './modules/solicitacoes/solicitacoes.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsuariosCrmModule } from './modules/usuarios-crm/usuarios-crm.module';

// NOTE: módulos do CRM antigos (auth, users, organizations, roles, permissions)
// foram escritos pra um schema anterior em camelCase inglês. Estão desabilitados
// até serem refatorados pro schema atual em Portuguese snake_case.
// `audit` já foi refatorado e está ativo (trilha de auditoria — RF42).

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
    AuthCrmModule,
    UsuariosCrmModule,
    AcessibilidadeModule,
    EspecialidadesModule,
    SolicitacoesModule,
    NotificacoesModule,
    UploadsModule,
    AtendimentoModule,
    IntegracoesModule,
    FluxosModule,
    AuditModule,
  ],
})
export class AppModule {}
