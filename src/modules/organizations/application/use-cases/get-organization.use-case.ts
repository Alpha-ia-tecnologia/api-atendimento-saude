import { Inject, Injectable } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { ResourceNotFoundException } from '../../../../shared/exceptions/domain.exception';
import { OrganizationMapper } from '../../infrastructure/mappers/organization.mapper';
import { OrganizationResponseDto } from '../dtos/organization-response.dto';

@Injectable()
export class GetOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(id: string): Promise<OrganizationResponseDto> {
    const org = await this.organizationRepository.findById(id);
    if (!org) throw new ResourceNotFoundException('Organização');
    return OrganizationMapper.toResponse(org);
  }
}
