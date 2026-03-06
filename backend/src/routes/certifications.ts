import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { name, status, type } = req.query;

    const where: any = {};
    if (name) where.name = { contains: name as string };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { id: 'desc' };

    const [data, total] = await Promise.all([
      prisma.certification.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.certification.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

export { router as certificationRoutes };
