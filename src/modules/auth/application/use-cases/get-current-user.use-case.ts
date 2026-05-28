import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { AuthUserDto } from '../dtos/auth-response.dto';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<AuthUserDto> {
    const user = await this.userRepository.findWithRolesAndPermissions(userId);
    if (!user || !user.isActive()) throw new UnauthorizedException('Usuário inativo');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roleNames(),
      permissions: user.allPermissions(),
    };
  }
}
