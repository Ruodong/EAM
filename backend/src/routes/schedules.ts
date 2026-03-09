import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapSchedule(s: any) {
  return {
    id:                s.id,
    scheduleNo:        Number(s.schedule_no),
    title:             s.schedule_title,
    scheduleTitle:     s.schedule_title,
    projectId:         s.project_id,
    startTime:         s.start_time,
    endTime:           s.end_time,
    duration:          s.duration,
    recurrencePattern: s.recurrence_pattern,
    endAfter:          s.end_after,
    owner:             s.owner,
    ownerName:         Array.isArray(s.owner) ? s.owner.join(', ') : (s.owner ?? ''),
    remark:            s.remark,
    status:            s.status,
    forProject:        s.for_project,
    forMeeting:        s.for_meeting,
  };
}

// GET /api/schedules — List with pagination, filtering, sorting + stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { status, timeFrom } = req.query;

    const where: any = {};
    if (status)   where.status     = status as string;
    if (timeFrom) where.start_time = { gte: new Date(timeFrom as string) };

    const fieldMap: Record<string, string> = {
      scheduleNo: 'schedule_no',
      title:      'schedule_title',
      status:     'status',
      startTime:  'start_time',
      endTime:    'end_time',
      duration:   'duration',
      ownerName:  'owner',
    };
    const dbSortField = sortField ? (fieldMap[sortField] || sortField) : 'schedule_no';
    const orderBy: any = { [dbSortField]: sortOrder || 'desc' };

    const [data, total, availableCount, bookedCount, expiredCount, completedCount] = await Promise.all([
      prisma.eam_ea_calendar.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eam_ea_calendar.count({ where }),
      prisma.eam_ea_calendar.count({ where: { status: 'Available' } }),
      prisma.eam_ea_calendar.count({ where: { status: 'Booked' } }),
      prisma.eam_ea_calendar.count({ where: { status: 'Expired' } }),
      prisma.eam_ea_calendar.count({ where: { status: 'Completed' } }),
    ]);

    res.json({
      ...buildPaginatedResponse(data.map(mapSchedule), total, page, pageSize),
      stats: { total, available: availableCount, booked: bookedCount, expired: expiredCount, completed: completedCount },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// POST /api/schedules — Create new schedule slot
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      scheduleTitle, startTime, endTime, duration,
      recurrencePattern, endAfter, owner, remark,
    } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    // If recurrence, generate multiple slots
    const slots: any[] = [];
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (recurrencePattern && endAfter && endAfter > 1) {
      for (let i = 0; i < endAfter; i++) {
        const slotStart = new Date(start);
        const slotEnd = new Date(end);

        if (recurrencePattern === 'Weekly') {
          slotStart.setDate(slotStart.getDate() + i * 7);
          slotEnd.setDate(slotEnd.getDate() + i * 7);
        } else if (recurrencePattern === 'Biweekly') {
          slotStart.setDate(slotStart.getDate() + i * 14);
          slotEnd.setDate(slotEnd.getDate() + i * 14);
        } else if (recurrencePattern === 'Monthly') {
          slotStart.setMonth(slotStart.getMonth() + i);
          slotEnd.setMonth(slotEnd.getMonth() + i);
        }

        slots.push({
          schedule_title:     scheduleTitle ?? null,
          start_time:         slotStart,
          end_time:           slotEnd,
          duration:           duration ?? null,
          recurrence_pattern: recurrencePattern ?? null,
          end_after:          endAfter ?? null,
          owner:              owner ?? [],
          remark:             remark ?? null,
          status:             'Available',
        });
      }
    } else {
      slots.push({
        schedule_title:     scheduleTitle ?? null,
        start_time:         start,
        end_time:           end,
        duration:           duration ?? null,
        recurrence_pattern: recurrencePattern ?? null,
        end_after:          endAfter ?? null,
        owner:              owner ?? [],
        remark:             remark ?? null,
        status:             'Available',
      });
    }

    const created = await Promise.all(
      slots.map(slot => prisma.eam_ea_calendar.create({ data: slot }))
    );

    res.status(201).json(created.map(mapSchedule));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id — Update schedule (book, cancel, etc.)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.eam_ea_calendar.findUnique({ where: { id: req.params.id as string } });
    if (!existing) return res.status(404).json({ error: 'Schedule not found' });

    const {
      scheduleTitle, startTime, endTime, duration,
      recurrencePattern, endAfter, owner, remark,
      status, forProject, forMeeting,
    } = req.body;

    const updateData: any = {};
    if (scheduleTitle !== undefined)     updateData.schedule_title     = scheduleTitle;
    if (startTime !== undefined)         updateData.start_time         = new Date(startTime);
    if (endTime !== undefined)           updateData.end_time           = new Date(endTime);
    if (duration !== undefined)          updateData.duration           = duration;
    if (recurrencePattern !== undefined) updateData.recurrence_pattern = recurrencePattern;
    if (endAfter !== undefined)          updateData.end_after          = endAfter;
    if (owner !== undefined)             updateData.owner              = owner;
    if (remark !== undefined)            updateData.remark             = remark;
    if (status !== undefined)            updateData.status             = status;
    if (forProject !== undefined)        updateData.for_project        = forProject;
    if (forMeeting !== undefined)        updateData.for_meeting        = forMeeting;

    const updated = await prisma.eam_ea_calendar.update({
      where: { id: req.params.id as string },
      data: updateData,
    });

    res.json(mapSchedule(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id — Delete schedule slot (only if Available)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.eam_ea_calendar.findUnique({ where: { id: req.params.id as string } });
    if (!existing) return res.status(404).json({ error: 'Schedule not found' });

    if (existing.status === 'Booked') {
      return res.status(400).json({ error: 'Cannot delete a booked schedule. Cancel the booking first.' });
    }

    await prisma.eam_ea_calendar.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export { router as scheduleRoutes };
