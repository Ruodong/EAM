import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { name, category, vendor, status } = req.query;

    const where: any = {};
    if (name) where.name = { contains: name as string };
    if (category) where.category = category as string;
    if (vendor) where.vendor = { contains: vendor as string };
    if (status) where.status = status as string;

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { name: 'asc' };

    const [data, total] = await Promise.all([
      prisma.technologyStack.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.technologyStack.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch technology stack' });
  }
});

export { router as technologyStackRoutes };
