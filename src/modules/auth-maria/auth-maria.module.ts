import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { TokenMariaService } from './application/services/token-maria.service';
import { AtualizarFotoPerfilUseCase } from './application/use-cases/atualizar-foto-perfil.use-case';
import { LoginMariaUseCase } from './application/use-cases/login-maria.use-case';
import { RegistroMariaUseCase } from './application/use-cases/registro-maria.use-case';
import { AuthMariaController } from './presentation/controllers/auth-maria.controller';
import { JwtMariaGuard } from './presentation/guards/jwt-maria.guard';

@Module({
  imports: [FilesModule],
  controllers: [AuthMariaController],
  providers: [
    TokenMariaService,
    LoginMariaUseCase,
    RegistroMariaUseCase,
    AtualizarFotoPerfilUseCase,
    JwtMariaGuard,
  ],
  exports: [TokenMariaService, JwtMariaGuard],
})
export class AuthMariaModule {}
