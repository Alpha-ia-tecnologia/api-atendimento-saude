import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ROLE_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, actorId?: string): Promise<void> {
    const existing = await this.roleRepository.findById(id);
    if (!existing) throw new ResourceNotFoundException('Papel');

    await this.roleRepository.softDelete(id);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ROLE_DELETE',
      resource: 'ROLE',
      resourceId: id,
    });
  }
}
