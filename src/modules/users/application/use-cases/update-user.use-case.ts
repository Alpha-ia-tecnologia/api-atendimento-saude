import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { USER_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { UserMapper } from '../../infrastructure/mappers/user.mapper';
import { UserResponseDto } from '../dtos/user-response.dto';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, dto: UpdateUserDto, actorId?: string): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(id);
    if (!existing) throw new ResourceNotFoundException('Usuário');

    const updated = await this.userRepository.update(id, {
      name: dto.name,
      organizationId: dto.organizationId ?? undefined,
      roleIds: dto.roleIds,
    });

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'USER_UPDATE',
      resource: 'USER',
      resourceId: id,
    });

    return UserMapper.toResponse(updated);
  }
}
