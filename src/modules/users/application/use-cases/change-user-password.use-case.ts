import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import {
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { RefreshTokenRepository } from '../../../auth/domain/repositories/refresh-token.repository';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { hashPassword } from '../../../../shared/utils/bcrypt.util';

@Injectable()
export class ChangeUserPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, dto: ChangePasswordDto, actorId?: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new ResourceNotFoundException('Usuário');

    const saltRounds = Number(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10'));
    const passwordHash = await hashPassword(dto.newPassword, saltRounds);
    await this.userRepository.updatePassword(id, passwordHash);
    await this.refreshTokenRepository.revokeAllByUserId(id);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'USER_PASSWORD_CHANGE',
      resource: 'USER',
      resourceId: id,
    });
  }
}
