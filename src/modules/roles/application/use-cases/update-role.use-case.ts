import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateRoleDto } from '../dtos/update-role.dto';
import { RoleResponseDto } from '../dtos/role-response.dto';
import { ROLE_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { RoleMapper } from '../../infrastructure/mappers/role.mapper';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, dto: UpdateRoleDto, actorId?: string): Promise<RoleResponseDto> {
    const existing = await this.roleRepository.findById(id);
    if (!existing) throw new ResourceNotFoundException('Papel');

    const updated = await this.roleRepository.update(id, dto);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ROLE_UPDATE',
      resource: 'ROLE',
      resourceId: id,
    });
    return RoleMapper.toResponse(updated);
  }
}
