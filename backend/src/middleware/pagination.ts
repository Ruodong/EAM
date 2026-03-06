import { Request } from 'express';

export function getPaginationParams(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
  const sortField = (req.query.sortField as string) || undefined;
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
  const skip = (page - 1) * pageSize;

  return { page, pageSize, sortField, sortOrder, skip };
}

export function buildPaginatedResponse<T>(data: T[], total: number, page: number, pageSize: number) {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
