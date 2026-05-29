import { Module } from '@nestjs/common';

import { AuthMariaModule } from '../auth-maria/auth-maria.module';
import { AtualizarAcessibilidadeUseCase } from './application/use-cases/atualizar-acessibilidade.use-case';
import { ObterAcessibilidadeUseCase } from './application/use-cases/obter-acessibilidade.use-case';
import { AcessibilidadeController } from './presentation/controllers/acessibilidade.controller';

@Module({
  imports: [AuthMariaModule], // JwtMariaGuard
  controllers: [AcessibilidadeController],
  providers: [ObterAcessibilidadeUseCase, AtualizarAcessibilidadeUseCase],
})
export class AcessibilidadeModule {}
