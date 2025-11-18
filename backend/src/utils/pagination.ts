import { Knex } from 'knex';

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const paginate = async <T>(
  query: Knex.QueryBuilder,
  page: number = 1,
  limit: number = 20
): Promise<PaginationResult<T>> => {
  const offset = (page - 1) * limit;

  // Get total count (clone query to avoid modifying original)
  const countQuery = query.clone().clearSelect().clearOrder().count('* as count').first();
  const totalResult = await countQuery;
  const total = parseInt(totalResult?.count as string) || 0;

  // Get paginated data
  const data = await query.limit(limit).offset(offset);

  const totalPages = Math.ceil(total / limit);

  return {
    data: data as T[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

