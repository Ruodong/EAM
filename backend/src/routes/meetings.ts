import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { projectId, meetingTitle, meetingAgent, requestName, createdBy } = req.query;

    const where: any = {};
    if (projectId) where.projectId = { contains: projectId as string };
    if (meetingTitle) where.meetingTitle = { contains: meetingTitle as string };
    if (meetingAgent) where.meetingAgent = { contains: meetingAgent as string };
    if (requestName) where.requestName = { contains: requestName as string };
    if (createdBy) where.createdBy = { contains: createdBy as string };

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { meetingNo: 'desc' };

    const [data, total] = await Promise.all([
      prisma.meeting.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.meeting.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data, total, page, pageSize));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const meeting = await prisma.meeting.create({ data: req.body });
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

export { router as meetingRoutes };
