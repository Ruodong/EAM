import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { requestId, requestStatus, reviewResult, reviewScope, requestor, assignedReviewer, pm, organization, projectId } = req.query;

    const where: any = {};
    if (requestId) where.requestId = { contains: requestId as string };
    if (requestStatus) where.requestStatus = requestStatus as string;
    if (reviewResult) where.reviewResult = reviewResult as string;
    if (reviewScope) where.reviewScope = reviewScope as string;
    if (requestor) where.requestor = { contains: requestor as string };
    if (assignedReviewer) where.assignedReviewer = { contains: assignedReviewer as string };
    if (pm) where.pm = { contains: pm as string };
    if (organization) where.organization = organization as string;
    if (projectId) where.projectId = { contains: projectId as string };

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { changedAt: 'desc' };

    const [data, total] = await Promise.all([
      prisma.eARequest.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eARequest.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch EA requests' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const request = await prisma.eARequest.create({ data: req.body });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create EA request' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const request = await prisma.eARequest.findUnique({ where: { requestId: req.params.id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

export { router as eaRequestRoutes };
