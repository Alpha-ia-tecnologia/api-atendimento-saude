import { Module } from '@nestjs/common';

import { AuthCrmModule } from '../auth-crm/auth-crm.module';
import { AlterarStatusUsuarioCrmUseCase } from './application/use-cases/alterar-status-usuario-crm.use-case';
import { AtualizarUsuarioCrmUseCase } from './application/use-cases/atualizar-usuario-crm.use-case';
import { CriarUsuarioCrmUseCase } from './application/use-cases/criar-usuario-crm.use-case';
import { ListarUsuariosCrmUseCase } from './application/use-cases/listar-usuarios-crm.use-case';
import { RedefinirSenhaUsuarioCrmUseCase } from './application/use-cases/redefinir-senha-usuario-crm.use-case';
import { UsuariosCrmController } from './presentation/controllers/usuarios-crm.controller';

@Module({
  // AuthCrmModule exporta JwtCrmGuard e PerfilGuard usados no controller.
  imports: [AuthCrmModule],
  controllers: [UsuariosCrmController],
  providers: [
    CriarUsuarioCrmUseCase,
    ListarUsuariosCrmUseCase,
    AtualizarUsuarioCrmUseCase,
    AlterarStatusUsuarioCrmUseCase,
    RedefinirSenhaUsuarioCrmUseCase,
  ],
})
export class UsuariosCrmModule {}
