import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { OrganizationResponseDto } from '../dtos/organization-response.dto';
import { ORGANIZATION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { ResourceConflictException } from '../../../../shared/exceptions/domain.exception';
import { OrganizationMapper } from '../../infrastructure/mappers/organization.mapper';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreateOrganizationDto, actorId?: string): Promise<OrganizationResponseDto> {
    if (dto.document) {
      const existing = await this.organizationRepository.findByDocument(dto.document);
      if (existing) throw new ResourceConflictException('Documento já cadastrado');
    }
    const org = await this.organizationRepository.create(dto);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: actorId,
      action: 'ORGANIZATION_CREATE',
      resource: 'ORGANIZATION',
      resourceId: org.id,
    });
    return OrganizationMapper.toResponse(org);
  }
}
