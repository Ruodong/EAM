import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

// ─── Lead Time Report ────────────────────────────────────────────
// Computes request lifecycle timing from process log entries

router.get('/lead-time', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req);
    const { projectId, status } = req.query;

    const where: any = {};
    if (projectId) where.project_id = { contains: projectId as string, mode: 'insensitive' };
    if (status)    where.status = status as string;

    const [requests, total] = await Promise.all([
      prisma.eam_request.findMany({
        where,
        orderBy: { create_at: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.eam_request.count({ where }),
    ]);

    // For each request, fetch process log to determine status timestamps
    const results = await Promise.all(
      requests.map(async (r) => {
        const project = await prisma.project.findFirst({
          where: { project_id: r.project_id ?? '' },
          select: { project_name: true },
        });

        const processLogs = await prisma.eam_request_process_log.findMany({
          where: { request_id: r.request_id ?? undefined },
          orderBy: { create_at: 'asc' },
        });

        // Extract timestamps from process log
        let draftTime: Date | null = r.create_at;
        let inProgressTime: Date | null = null;
        let completedTime: Date | null = null;

        for (const log of processLogs) {
          const action = (log.action ?? '').toLowerCase();
          if (action.includes('in progress') || action.includes('submit') || action.includes('accept')) {
            if (!inProgressTime) inProgressTime = log.create_at;
          }
          if (action.includes('complete') || action.includes('approved') || action.includes('close')) {
            completedTime = log.create_at;
          }
        }

        // Calculate total lead time in days
        let totalLeadTimeDays: number | null = null;
        if (draftTime && completedTime) {
          totalLeadTimeDays = Math.round(
            (completedTime.getTime() - draftTime.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        return {
          id: r.id,
          requestId: r.request_id,
          projectId: r.project_id,
          projectName: project?.project_name ?? '',
          overallStatus: r.status,
          draftTime: draftTime?.toISOString() ?? null,
          inProgressTime: inProgressTime?.toISOString() ?? null,
          completedTime: completedTime?.toISOString() ?? null,
          totalLeadTimeDays,
        };
      })
    );

    res.json(buildPaginatedResponse(results, total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate lead time report' });
  }
});

export { router as reportRoutes };
