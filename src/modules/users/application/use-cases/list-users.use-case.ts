import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../../shared/constants/injection-tokens';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PaginationQueryDto } from '../../../../shared/dtos/pagination-query.dto';
import { buildPagination } from '../../../../shared/utils/pagination.util';
import { UserMapper } from '../../infrastructure/mappers/user.mapper';
import { PaginatedResult } from '../../../../shared/types/pagination';
import { UserResponseDto } from '../dtos/user-response.dto';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResult<UserResponseDto>> {
    const filters = buildPagination(query);
    const result = await this.userRepository.findMany(filters);
    return {
      items: result.items.map(UserMapper.toResponse),
      meta: result.meta,
    };
  }
}
