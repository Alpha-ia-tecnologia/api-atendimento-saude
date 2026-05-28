import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChangeUserStatusDto } from '../dtos/change-user-status.dto';
import { USER_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { UserMapper } from '../../infrastructure/mappers/user.mapper';
import { UserResponseDto } from '../dtos/user-response.dto';

@Injectable()
export class ChangeUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, dto: ChangeUserStatusDto, actorId?: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new ResourceNotFoundException('Usuário');

    const updated = await this.userRepository.update(id, { status: dto.status });

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'USER_STATUS_CHANGE',
      resource: 'USER',
      resourceId: id,
      metadata: { status: dto.status },
    });

    return UserMapper.toResponse(updated);
  }
}
