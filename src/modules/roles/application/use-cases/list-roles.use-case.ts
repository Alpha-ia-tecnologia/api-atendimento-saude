import { Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';
import { buildPagination } from '../../../../shared/utils/pagination.util';
import { RoleMapper } from '../../infrastructure/mappers/role.mapper';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { RoleResponseDto } from '../dtos/role-response.dto';

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResult<RoleResponseDto>> {
    const filters = buildPagination(query);
    const result = await this.roleRepository.findMany(filters);
    return { items: result.items.map(RoleMapper.toResponse), meta: result.meta };
  }
}
