import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { status, timeFrom } = req.query;

    const where: any = {};
    if (status) where.status = status as string;
    if (timeFrom) where.startTime = { gte: new Date(timeFrom as string) };

    const orderBy: any = sortField ? { [sortField]: sortOrder } : { scheduleNo: 'desc' };

    const [data, total, availableCount, bookedCount, expiredCount, completedCount] = await Promise.all([
      prisma.schedule.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.schedule.count({ where }),
      prisma.schedule.count({ where: { status: 'Available' } }),
      prisma.schedule.count({ where: { status: 'Booked' } }),
      prisma.schedule.count({ where: { status: 'Expired' } }),
      prisma.schedule.count({ where: { status: 'Completed' } }),
    ]);

    res.json({
      ...buildPaginatedResponse(data, total, page, pageSize),
      stats: { total, available: availableCount, booked: bookedCount, expired: expiredCount, completed: completedCount },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.schedule.create({ data: req.body });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

export { router as scheduleRoutes };
