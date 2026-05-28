import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';
import { OrganizationResponseDto } from '../dtos/organization-response.dto';
import { ORGANIZATION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { OrganizationMapper } from '../../infrastructure/mappers/organization.mapper';

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: string,
    dto: UpdateOrganizationDto,
    actorId?: string,
  ): Promise<OrganizationResponseDto> {
    const existing = await this.organizationRepository.findById(id);
    if (!existing) throw new ResourceNotFoundException('Organização');

    const updated = await this.organizationRepository.update(id, dto);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ORGANIZATION_UPDATE',
      resource: 'ORGANIZATION',
      resourceId: id,
    });
    return OrganizationMapper.toResponse(updated);
  }
}
