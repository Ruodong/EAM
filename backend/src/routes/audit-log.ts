import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

// ─── Audit Log (Field Change Log) ───────────────────────────────

router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { projectId, objectType, field, createBy } = req.query;

    const where: any = {};
    if (projectId)  where.project_id  = projectId as string;
    if (objectType) where.object_type = objectType as string;
    if (field)      where.field       = { contains: field as string, mode: 'insensitive' };
    if (createBy)   where.create_by   = { contains: createBy as string, mode: 'insensitive' };

    const fieldMap: Record<string, string> = { createdAt: 'create_time' };
    const dbSort = sortField ? (fieldMap[sortField as string] || (sortField as string)) : 'create_time';
    const orderBy: any = { [dbSort]: sortOrder || 'desc' };

    const [data, total] = await Promise.all([
      prisma.eam_audit_log.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eam_audit_log.count({ where }),
    ]);

    res.json(buildPaginatedResponse(
      data.map(l => ({
        id: l.id, objectType: l.object_type, objectId: l.object_id,
        field: l.field, oldValue: l.old_value, newValue: l.new_value,
        createdBy: l.create_by, createdAt: l.create_time, projectId: l.project_id,
      })),
      total, page, pageSize,
    ));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ─── Process Log ─────────────────────────────────────────────────

router.get('/process-logs', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.query;
    const where: any = {};
    if (requestId) where.request_id = requestId as string;

    const data = await prisma.eam_request_process_log.findMany({
      where,
      orderBy: { create_at: 'desc' },
    });

    res.json(data.map(l => ({
      id: l.id, requestId: l.request_id, action: l.action,
      comment: l.comment, operator: l.operator, createdAt: l.create_at,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch process logs' });
  }
});

// ─── Email Logs ──────────────────────────────────────────────────

router.get('/email-logs/actions', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req);
    const { projectId } = req.query;
    const where: any = {};
    if (projectId) where.project_id = projectId as string;

    const [data, total] = await Promise.all([
      prisma.eam_actions_email_log.findMany({ where, orderBy: { log_time: 'desc' }, skip, take: pageSize }),
      prisma.eam_actions_email_log.count({ where }),
    ]);

    res.json(buildPaginatedResponse(
      data.map(l => ({
        id: l.id, projectId: l.project_id, meetingId: l.meeting_id,
        actionId: l.action_id, logTime: l.log_time, from: l.from,
        recipients: l.recipients, subject: l.subject, status: l.status,
      })),
      total, page, pageSize,
    ));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch action email logs' });
  }
});

router.get('/email-logs/meetings', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req);
    const { projectId } = req.query;
    const where: any = {};
    if (projectId) where.project_id = projectId as string;

    const [data, total] = await Promise.all([
      prisma.eam_meetings_email_log.findMany({ where, orderBy: { log_time: 'desc' }, skip, take: pageSize }),
      prisma.eam_meetings_email_log.count({ where }),
    ]);

    // Look up project_id from meetings table when email log has null/invalid project_id
    const meetingIds = [...new Set(data.map(l => l.meeting_id).filter(Boolean))];
    const meetingMap: Record<string, string> = {};
    if (meetingIds.length > 0) {
      const meetings = await prisma.eam_meetings.findMany({
        where: { id: { in: meetingIds } },
        select: { id: true, project_id: true },
      });
      meetings.forEach(m => { meetingMap[m.id] = m.project_id; });
    }

    res.json(buildPaginatedResponse(
      data.map(l => {
        const pid = l.project_id?.trim();
        const resolvedProjectId = (pid && pid !== 'null') ? pid : (meetingMap[l.meeting_id] || null);
        return {
          id: l.id, projectId: resolvedProjectId, meetingId: l.meeting_id,
          logTime: l.log_time, from: l.from, recipients: l.recipients,
          subject: l.subject, status: l.status,
        };
      }),
      total, page, pageSize,
    ));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meeting email logs' });
  }
});

export { router as auditLogRoutes };
