import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChangeOrganizationStatusDto } from '../dtos/change-organization-status.dto';
import { OrganizationResponseDto } from '../dtos/organization-response.dto';
import { ORGANIZATION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { OrganizationMapper } from '../../infrastructure/mappers/organization.mapper';

@Injectable()
export class ChangeOrganizationStatusUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: string,
    dto: ChangeOrganizationStatusDto,
    actorId?: string,
  ): Promise<OrganizationResponseDto> {
    const existing = await this.organizationRepository.findById(id);
    if (!existing) throw new ResourceNotFoundException('Organização');

    const updated = await this.organizationRepository.update(id, { status: dto.status });
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ORGANIZATION_STATUS_CHANGE',
      resource: 'ORGANIZATION',
      resourceId: id,
      metadata: { status: dto.status },
    });
    return OrganizationMapper.toResponse(updated);
  }
}
