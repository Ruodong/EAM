import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { version, domainL1, subDomainL2, bcName, level } = req.query;

    const where: any = {};
    if (version) where.version = version as string;
    if (domainL1) where.domainL1 = domainL1 as string;
    if (subDomainL2) where.subDomainL2 = subDomainL2 as string;
    if (bcName) where.bcName = { contains: bcName as string };
    if (level) where.level = parseInt(level as string);

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { bcId: 'asc' };

    const [data, total] = await Promise.all([
      prisma.bCPFMasterData.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.bCPFMasterData.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch BCPF master data' });
  }
});

export { router as bcpfRoutes };
