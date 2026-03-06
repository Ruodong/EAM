import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { projectId, actionTitle, requestName, actionId, assignee, status, requestedBy, createdBy } = req.query;

    const where: any = {};
    if (projectId) where.projectId = { contains: projectId as string };
    if (actionTitle) where.actionTitle = { contains: actionTitle as string };
    if (requestName) where.requestName = { contains: requestName as string };
    if (actionId) where.actionId = parseInt(actionId as string) || undefined;
    if (assignee) where.assignee = { contains: assignee as string };
    if (status) where.status = status as string;
    if (requestedBy) where.requestedBy = { contains: requestedBy as string };
    if (createdBy) where.createdBy = { contains: createdBy as string };

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { actionId: 'desc' };

    const [data, total, openCount, validationCount, closedCount] = await Promise.all([
      prisma.action.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.action.count({ where }),
      prisma.action.count({ where: { ...where, status: 'Open' } }),
      prisma.action.count({ where: { ...where, status: 'In Validation' } }),
      prisma.action.count({ where: { ...where, status: 'Closed' } }),
    ]);

    res.json({
      ...buildPaginatedResponse(data, total, page, pageSize),
      stats: { total, open: openCount, inValidation: validationCount, closed: closedCount },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const action = await prisma.action.create({ data: req.body });
    res.status(201).json(action);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create action' });
  }
});

export { router as actionRoutes };
