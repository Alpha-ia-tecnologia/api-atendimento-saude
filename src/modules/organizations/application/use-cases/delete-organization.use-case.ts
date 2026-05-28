import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ORGANIZATION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';

@Injectable()
export class DeleteOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, actorId?: string): Promise<void> {
    const existing = await this.organizationRepository.findById(id);
    if (!existing) throw new ResourceNotFoundException('Organização');

    await this.organizationRepository.softDelete(id);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ORGANIZATION_DELETE',
      resource: 'ORGANIZATION',
      resourceId: id,
    });
  }
}
