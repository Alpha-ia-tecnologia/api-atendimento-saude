import { Inject, Injectable } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';
import { buildPagination } from '../../../../shared/utils/pagination.util';
import { OrganizationMapper } from '../../infrastructure/mappers/organization.mapper';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { OrganizationResponseDto } from '../dtos/organization-response.dto';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResult<OrganizationResponseDto>> {
    const filters = buildPagination(query);
    const result = await this.organizationRepository.findMany(filters);
    return { items: result.items.map(OrganizationMapper.toResponse), meta: result.meta };
  }
}
