import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapLog(l: any) {
  return {
    id:        l.id,
    comment:   l.comment,
    createdAt: l.create_at,
    operator:  l.operator,
    operation: l.operation,
    projectId: l.project_id,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { projectId, operator } = req.query;

    const where: any = {};
    if (projectId) where.project_id = projectId as string;
    if (operator)  where.operator   = { contains: operator as string, mode: 'insensitive' };

    const fieldMap: Record<string, string> = { createdAt: 'create_at' };
    const dbSortField = sortField ? (fieldMap[sortField as string] || (sortField as string)) : 'create_at';
    const orderBy: any = { [dbSortField]: sortOrder || 'desc' };

    const [data, total] = await Promise.all([
      prisma.eam_review_log.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eam_review_log.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data.map(mapLog), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch EA review logs' });
  }
});

export { router as eaReviewLogRoutes };
