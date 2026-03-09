import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalProjects,
      completedRequests,
      inProgressRequests,
      totalMeetings,
      totalActions,
      pendingActions,
      scopeCheckCount,
      scopeOfChangeCount,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.eam_request.count({ where: { status: 'Completed' } }),
      prisma.eam_request.count({ where: { status: 'In Progress' } }),
      prisma.eam_meetings.count(),
      prisma.eam_actions.count(),
      prisma.eam_actions.count({ where: { status: 'Open' } }),
      prisma.eam_scope_check_list.count(),
      prisma.eam_scope_of_change.count(),
    ]);

    res.json({
      totalProjects,
      inProgress: inProgressRequests,
      completed: completedRequests,
      meetings: totalMeetings,
      actions: totalActions,
      pending: pendingActions,
      scopeCheck: scopeCheckCount,
      scopeOfChange: scopeOfChangeCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/home-stats', async (_req: Request, res: Response) => {
  try {
    const [myProjects, myRequests, myActions, requestQueue] = await Promise.all([
      prisma.project.count(),
      prisma.eam_request.count({ where: { status: { not: 'Draft' } } }),
      prisma.eam_actions.count({ where: { status: 'Open' } }),
      prisma.eam_request.count({ where: { status: 'Submitted' } }),
    ]);

    res.json({ myProjects, myRequests, myActions, requestQueue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch home stats' });
  }
});

export { router as dashboardRoutes };
