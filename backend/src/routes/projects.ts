import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { projectId, projectName, itCode, requestStatus, aiRelated } = req.query;

    const where: any = {};
    if (projectId) where.projectId = { contains: projectId as string };
    if (projectName) where.projectName = { contains: projectName as string };
    if (itCode) where.itLead = { contains: itCode as string };
    if (requestStatus) where.requestStatus = requestStatus as string;
    if (aiRelated) where.aiRelated = aiRelated as string;

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      prisma.project.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.project.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.create({ data: req.body });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({ where: { projectId: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

export { router as projectRoutes };
