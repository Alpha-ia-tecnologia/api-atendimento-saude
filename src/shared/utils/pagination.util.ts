import { PaginatedResult, PaginationParams } from '../types/pagination';

export function buildPagination(query: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}): PaginationParams {
  const page = query.page && query.page > 0 ? query.page : 1;
  const rawLimit = query.limit && query.limit > 0 ? query.limit : 10;
  const limit = Math.min(rawLimit, 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder ?? 'desc',
    status: query.status,
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}
