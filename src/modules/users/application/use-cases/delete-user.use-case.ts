import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { RefreshTokenRepository } from '../../../auth/domain/repositories/refresh-token.repository';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, actorId?: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new ResourceNotFoundException('Usuário');

    await this.userRepository.softDelete(id);
    await this.refreshTokenRepository.revokeAllByUserId(id);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'USER_DELETE',
      resource: 'USER',
      resourceId: id,
    });
  }
}
