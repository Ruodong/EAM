import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalProjects,
      completedProjects,
      meetings,
      totalActions,
      pendingActions,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.eARequest.count({ where: { requestStatus: 'Completed' } }),
      prisma.meeting.count(),
      prisma.action.count(),
      prisma.action.count({ where: { status: 'Open' } }),
    ]);

    const inProgressProjects = totalProjects - completedProjects;

    res.json({
      totalProjects,
      inProgressProjects,
      completedProjects,
      meetings,
      totalActions,
      pendingActions,
      scopeCheckList: Math.floor(totalActions * 0.29),
      scopeOfChange: Math.floor(totalActions * 0.59),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/home-stats', async (_req: Request, res: Response) => {
  try {
    const [myProjects, myRequests, myActions, requestQueue] = await Promise.all([
      prisma.project.count(),
      prisma.eARequest.count({ where: { requestStatus: { not: 'Draft' } } }),
      prisma.action.count({ where: { status: 'Open' } }),
      prisma.eARequest.count({ where: { requestStatus: 'Submitted' } }),
    ]);

    res.json({ myProjects, myRequests, myActions, requestQueue });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch home stats' });
  }
});

export { router as dashboardRoutes };
