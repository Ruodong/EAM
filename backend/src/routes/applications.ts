import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { applicationId, applicationName, applicationClassification, functionValueChain, version, domainL1, subDomainL2, bcName } = req.query;

    const where: any = {};
    if (applicationId) where.applicationId = { contains: applicationId as string };
    if (applicationName) where.applicationName = { contains: applicationName as string };
    if (applicationClassification) where.applicationClassification = { contains: applicationClassification as string };
    if (functionValueChain) where.functionValueChain = { contains: functionValueChain as string };
    if (version) where.version = version as string;
    if (domainL1) where.domainL1 = domainL1 as string;
    if (subDomainL2) where.subDomainL2 = subDomainL2 as string;
    if (bcName) where.bcName = { contains: bcName as string };

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { applicationId: 'asc' };

    const [data, total] = await Promise.all([
      prisma.application.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.application.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

export { router as applicationRoutes };
