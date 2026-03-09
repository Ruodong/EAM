import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapAction(a: any) {
  return {
    id:                a.id,
    actionNo:          Number(a.action_no),
    actionId:          Number(a.action_no),
    title:             a.action_title,
    actionTitle:       a.action_title,
    projectId:         a.project_id,
    meetingId:         a.meeting_id,
    priority:          a.priority,
    dueDate:           a.due_date,
    closeDate:         a.close_date,
    startDate:         a.start_date,
    openDate:          a.open_date,
    assignee:          a.assignee,
    assigneeName:      a.assignee_name,
    actionDescription: a.action_description,
    status:            a.status,
    type:              a.type,
    requestedBy:       a.requested_by,
    requestedByName:   a.requested_by_name,
    actionUpdates:     a.action_updates,
    applicableDomain:  a.applicable_domain,
    createdAt:         a.create_at,
    updatedAt:         a.update_at,
    createdBy:         a.create_by,
    requestId:         a.request_id,
  };
}

// GET /api/actions — List with pagination, filtering, sorting + stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { title, requestId, projectId, status, assigneeName, priority, reviewerName } = req.query;

    const where: any = {};
    if (title)       where.action_title      = { contains: title as string, mode: 'insensitive' };
    if (requestId)   where.request_id        = requestId as string;
    if (projectId)   where.project_id        = projectId as string;
    if (status)      where.status            = status as string;
    if (priority)    where.priority          = priority as string;

    // Resolve reviewerName → project_id list via team_members + request tables
    if (reviewerName) {
      const projectRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT DISTINCT r.project_id
        FROM eam.eam_request r
        JOIN eam.eam_bigea_team_members t ON t.itcode = ANY(r.assign_reviewer)
        WHERE t.name = $1 AND r.project_id IS NOT NULL
      `, reviewerName as string);
      const pids = projectRows.map((r: any) => r.project_id);
      if (pids.length === 0) {
        return res.json({
          ...buildPaginatedResponse([], 0, page, pageSize),
          stats: { total: 0, open: 0, inValidation: 0, closed: 0 },
        });
      }
      where.project_id = { in: pids };
    }

    const fieldMap: Record<string, string> = {
      actionId:         'action_no',
      actionNo:         'action_no',
      title:            'action_title',
      projectId:        'project_id',
      type:             'type',
      closeDate:        'close_date',
      dueDate:          'due_date',
      requestedBy:      'requested_by',
      assigneeName:     'assignee_name',
      applicableDomain: 'applicable_domain',
      status:           'status',
      requestId:        'request_id',
      createdAt:        'create_at',
    };
    const dbSortField = sortField ? (fieldMap[sortField] || sortField) : 'action_no';
    const orderBy: any = { [dbSortField]: sortOrder || 'desc' };

    const [data, total, openCount, validationCount, closedCount] = await Promise.all([
      prisma.eam_actions.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eam_actions.count({ where }),
      prisma.eam_actions.count({ where: { ...where, status: 'Open' } }),
      prisma.eam_actions.count({ where: { ...where, status: 'In Validation' } }),
      prisma.eam_actions.count({ where: { ...where, status: 'Closed' } }),
    ]);

    // Enrich with projectName and requestName
    const projectIds = [...new Set(data.map((d: any) => d.project_id).filter(Boolean))];
    let projMap = new Map<string, string>();
    let reqMap = new Map<string, string>();
    if (projectIds.length > 0) {
      const [projects, requests] = await Promise.all([
        prisma.project.findMany({ where: { project_id: { in: projectIds } }, select: { project_id: true, project_name: true } }),
        prisma.eam_request.findMany({ where: { project_id: { in: projectIds } }, select: { project_id: true, request_id: true } }),
      ]);
      projMap = new Map(projects.map((p: any) => [p.project_id, p.project_name]));
      reqMap = new Map(requests.map((r: any) => [r.project_id, r.request_id]));
    }

    const enriched = data.map(mapAction).map((a: any) => ({
      ...a,
      projectName: projMap.get(a.projectId) ?? '',
      requestName: reqMap.get(a.projectId) ?? '',
    }));

    res.json({
      ...buildPaginatedResponse(enriched, total, page, pageSize),
      stats: { total, open: openCount, inValidation: validationCount, closed: closedCount },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// GET /api/actions/:actionNo — Get single action by action_no
router.get('/:actionNo', async (req: Request, res: Response) => {
  try {
    const ano = parseInt(req.params.actionNo as string);
    const action = await prisma.eam_actions.findFirst({ where: { action_no: ano } });
    if (!action) return res.status(404).json({ error: 'Action not found' });
    res.json(mapAction(action));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch action' });
  }
});

// POST /api/actions — Create new action
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      projectId, meetingId, actionTitle, priority, dueDate,
      startDate, assignee, assigneeName, actionDescription,
      type, requestedBy, requestedByName, applicableDomain,
      actionUpdates, createdBy, requestId,
    } = req.body;

    if (!projectId || !actionTitle || !priority || !actionDescription || !type || !requestedBy || !requestedByName || !applicableDomain) {
      return res.status(400).json({
        error: 'Required fields: projectId, actionTitle, priority, actionDescription, type, requestedBy, requestedByName, applicableDomain',
      });
    }

    const created = await prisma.eam_actions.create({
      data: {
        project_id:         projectId,
        meeting_id:         meetingId ?? null,
        action_title:       actionTitle,
        priority:           priority,
        due_date:           dueDate ? new Date(dueDate) : null,
        start_date:         startDate ? new Date(startDate) : null,
        open_date:          new Date(),
        assignee:           assignee ?? [],
        assignee_name:      assigneeName ?? [],
        action_description: actionDescription,
        status:             'Open',
        type:               type,
        requested_by:       requestedBy,
        requested_by_name:  requestedByName,
        action_updates:     actionUpdates ?? null,
        applicable_domain:  applicableDomain,
        create_by:          createdBy ?? null,
        create_at:          new Date(),
        update_at:          new Date(),
        request_id:         requestId ?? null,
      },
    });

    res.status(201).json(mapAction(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create action' });
  }
});

// PUT /api/actions/:actionNo — Update action
router.put('/:actionNo', async (req: Request, res: Response) => {
  try {
    const ano = parseInt(req.params.actionNo as string);
    const existing = await prisma.eam_actions.findFirst({ where: { action_no: ano } });
    if (!existing) return res.status(404).json({ error: 'Action not found' });

    const {
      actionTitle, priority, dueDate, startDate, closeDate,
      assignee, assigneeName, actionDescription, status, type,
      requestedBy, requestedByName, actionUpdates, applicableDomain,
      updatedBy, requestId,
    } = req.body;

    const updateData: any = { update_at: new Date() };
    if (actionTitle !== undefined)       updateData.action_title       = actionTitle;
    if (priority !== undefined)          updateData.priority           = priority;
    if (dueDate !== undefined)           updateData.due_date           = dueDate ? new Date(dueDate) : null;
    if (startDate !== undefined)         updateData.start_date         = startDate ? new Date(startDate) : null;
    if (closeDate !== undefined)         updateData.close_date         = closeDate ? new Date(closeDate) : null;
    if (assignee !== undefined)          updateData.assignee           = assignee;
    if (assigneeName !== undefined)      updateData.assignee_name      = assigneeName;
    if (actionDescription !== undefined) updateData.action_description = actionDescription;
    if (type !== undefined)              updateData.type               = type;
    if (requestedBy !== undefined)       updateData.requested_by       = requestedBy;
    if (requestedByName !== undefined)   updateData.requested_by_name  = requestedByName;
    if (actionUpdates !== undefined)     updateData.action_updates     = actionUpdates;
    if (applicableDomain !== undefined)  updateData.applicable_domain  = applicableDomain;
    if (updatedBy !== undefined)         updateData.update_by          = updatedBy;
    if (requestId !== undefined)         updateData.request_id         = requestId;

    // Handle status transitions
    if (status !== undefined && status !== existing.status) {
      updateData.status = status;
      if (status === 'In Validation') {
        updateData.in_validtion_date = new Date();
      }
      if (status === 'Closed') {
        updateData.close_date = updateData.close_date ?? new Date();
      }
    }

    const updated = await prisma.eam_actions.update({
      where: { id: existing.id },
      data: updateData,
    });

    res.json(mapAction(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update action' });
  }
});

// DELETE /api/actions/:actionNo — Delete action
router.delete('/:actionNo', async (req: Request, res: Response) => {
  try {
    const ano = parseInt(req.params.actionNo as string);
    const existing = await prisma.eam_actions.findFirst({ where: { action_no: ano } });
    if (!existing) return res.status(404).json({ error: 'Action not found' });

    await prisma.eam_actions.delete({ where: { id: existing.id } });
    res.json({ message: 'Action deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete action' });
  }
});

export { router as actionRoutes };
