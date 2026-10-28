export interface PaginationMeta {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function offsetFor(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function paginate<T>(data: T[], page: number, limit: number, total: number): Paginated<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total_records: total,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_previous_page: page > 1,
    },
  };
}
