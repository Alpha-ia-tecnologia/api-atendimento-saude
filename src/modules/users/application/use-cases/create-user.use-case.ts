import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { USER_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceConflictException } from '../../../../shared/exceptions/domain.exception';
import { hashPassword } from '../../../../shared/utils/bcrypt.util';
import { UserMapper } from '../../infrastructure/mappers/user.mapper';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreateUserDto, actorId?: string): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ResourceConflictException('E-mail já cadastrado');

    const saltRounds = Number(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10'));
    const passwordHash = await hashPassword(dto.password, saltRounds);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      status: dto.status,
      organizationId: dto.organizationId ?? null,
      roleIds: dto.roleIds,
    });

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'USER_CREATE',
      resource: 'USER',
      resourceId: user.id,
      metadata: { email: user.email },
    });

    return UserMapper.toResponse(user);
  }
}
