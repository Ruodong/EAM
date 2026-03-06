import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { operationTimeFrom } = req.query;

    const where: any = {};
    if (operationTimeFrom) {
      where.operationTime = { gte: new Date(operationTimeFrom as string) };
    }

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { operationTime: 'desc' };

    const [data, total] = await Promise.all([
      prisma.eAReviewLog.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eAReviewLog.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch EA review logs' });
  }
});

export { router as eaReviewLogRoutes };
