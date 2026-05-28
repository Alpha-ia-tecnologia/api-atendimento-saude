import { Inject, Injectable } from '@nestjs/common';
import { PERMISSION_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';
import { buildPagination } from '../../../../shared/utils/pagination.util';
import { PermissionMapper } from '../../infrastructure/mappers/permission.mapper';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { PermissionResponseDto } from '../dtos/permission-response.dto';

@Injectable()
export class ListPermissionsUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResult<PermissionResponseDto>> {
    const filters = buildPagination(query);
    const result = await this.permissionRepository.findMany(filters);
    return { items: result.items.map(PermissionMapper.toResponse), meta: result.meta };
  }
}
