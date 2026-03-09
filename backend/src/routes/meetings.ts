import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapMeeting(m: any) {
  return {
    id:                   m.id,
    meetingNo:            Number(m.meeting_no),
    title:                m.meeting_title,
    meetingTitle:         m.meeting_title,
    projectId:            m.project_id,
    projectObjectives:    m.project_objectives,
    availableEaSchedule:  m.available_ea_schedule,
    startTime:            m.start_time,
    endTime:              m.end_time,
    presenter:            m.presenter,
    attendees:            m.attendees,
    location:             m.location,
    meetingAgenda:        m.meeting_agenda,
    keyAgreementFindings: m.key_agreement_findings,
    reviewDecks:          m.review_decks,
    reviewRecording:      m.review_recording,
    status:               m.status,
    calendarId:           m.calendar_id,
    statusRemark:         m.status_remark,
    eaReviewResult:       m.ea_review_result,
    eaReviewRemark:       m.ea_review_remark,
    emailCC:              m.email_cc,
    createdBy:            m.create_by,
    createdAt:            m.create_at,
    updatedAt:            m.update_at,
    requestId:            m.request_id,
  };
}

// GET /api/meetings — List with pagination, filtering, sorting
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { title, requestId, projectId, status, reviewerName } = req.query;

    const where: any = {};
    if (title)     where.meeting_title = { contains: title as string, mode: 'insensitive' };
    if (requestId) where.request_id    = requestId as string;
    if (projectId) where.project_id    = projectId as string;
    if (status)    where.status        = status as string;

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
        return res.json(buildPaginatedResponse([], 0, page, pageSize));
      }
      where.project_id = { in: pids };
    }

    const fieldMap: Record<string, string> = {
      meetingNo:  'meeting_no',
      title:      'meeting_title',
      projectId:  'project_id',
      startTime:  'start_time',
      endTime:    'end_time',
      status:     'status',
      requestId:  'request_id',
      createdAt:  'create_at',
    };
    const dbSortField = sortField ? (fieldMap[sortField] || sortField) : 'meeting_no';
    const orderBy: any = { [dbSortField]: sortOrder || 'desc' };

    const [data, total] = await Promise.all([
      prisma.eam_meetings.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eam_meetings.count({ where }),
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

    const enriched = data.map(mapMeeting).map((m: any) => ({
      ...m,
      projectName: projMap.get(m.projectId) ?? '',
      requestName: reqMap.get(m.projectId) ?? '',
    }));

    res.json(buildPaginatedResponse(enriched, total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/:meetingNo — Get single meeting by meeting_no
router.get('/:meetingNo', async (req: Request, res: Response) => {
  try {
    const mno = parseInt(req.params.meetingNo as string);
    const meeting = await prisma.eam_meetings.findFirst({ where: { meeting_no: mno } });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json(mapMeeting(meeting));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// POST /api/meetings — Create new meeting
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      projectId, projectObjectives, meetingTitle, availableEaSchedule,
      startTime, endTime, presenter, attendees, location, meetingAgenda,
      keyAgreementFindings, reviewDecks, reviewRecording, calendarId,
      statusRemark, eaReviewResult, eaReviewRemark, emailCC,
      createdBy, requestId,
    } = req.body;

    if (!projectId || !meetingTitle || !startTime || !endTime) {
      return res.status(400).json({ error: 'projectId, meetingTitle, startTime, and endTime are required' });
    }

    const created = await prisma.eam_meetings.create({
      data: {
        project_id:             projectId,
        project_objectives:     projectObjectives ?? null,
        meeting_title:          meetingTitle,
        available_ea_schedule:  availableEaSchedule ?? null,
        start_time:             new Date(startTime),
        end_time:               new Date(endTime),
        presenter:              presenter ?? [],
        attendees:              attendees ?? [],
        location:               location ?? null,
        meeting_agenda:         meetingAgenda ?? '',
        key_agreement_findings: keyAgreementFindings ?? null,
        review_decks:           reviewDecks ?? [],
        review_recording:       reviewRecording ?? [],
        status:                 'Scheduled',
        calendar_id:            calendarId ?? null,
        status_remark:          statusRemark ?? null,
        ea_review_result:       eaReviewResult ?? null,
        ea_review_remark:       eaReviewRemark ?? null,
        email_cc:               emailCC ?? [],
        create_by:              createdBy ?? null,
        create_at:              new Date(),
        update_at:              new Date(),
        request_id:             requestId ?? null,
      },
    });

    // If calendarId is provided, mark the schedule as Booked
    if (calendarId) {
      await prisma.eam_ea_calendar.updateMany({
        where: { id: calendarId },
        data: { status: 'Booked', for_project: projectId, for_meeting: String(created.meeting_no) },
      });
    }

    res.status(201).json(mapMeeting(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// PUT /api/meetings/:meetingNo — Update meeting
router.put('/:meetingNo', async (req: Request, res: Response) => {
  try {
    const mno = parseInt(req.params.meetingNo as string);
    const existing = await prisma.eam_meetings.findFirst({ where: { meeting_no: mno } });
    if (!existing) return res.status(404).json({ error: 'Meeting not found' });

    const {
      projectObjectives, meetingTitle, availableEaSchedule,
      startTime, endTime, presenter, attendees, location, meetingAgenda,
      keyAgreementFindings, reviewDecks, reviewRecording, status,
      calendarId, statusRemark, eaReviewResult, eaReviewRemark,
      emailCC, updatedBy, requestId,
    } = req.body;

    const updateData: any = { update_at: new Date() };
    if (projectObjectives !== undefined)    updateData.project_objectives     = projectObjectives;
    if (meetingTitle !== undefined)          updateData.meeting_title          = meetingTitle;
    if (availableEaSchedule !== undefined)  updateData.available_ea_schedule  = availableEaSchedule;
    if (startTime !== undefined)            updateData.start_time             = new Date(startTime);
    if (endTime !== undefined)              updateData.end_time               = new Date(endTime);
    if (presenter !== undefined)            updateData.presenter              = presenter;
    if (attendees !== undefined)            updateData.attendees              = attendees;
    if (location !== undefined)             updateData.location               = location;
    if (meetingAgenda !== undefined)        updateData.meeting_agenda         = meetingAgenda;
    if (keyAgreementFindings !== undefined) updateData.key_agreement_findings = keyAgreementFindings;
    if (reviewDecks !== undefined)          updateData.review_decks           = reviewDecks;
    if (reviewRecording !== undefined)      updateData.review_recording       = reviewRecording;
    if (status !== undefined)               updateData.status                 = status;
    if (calendarId !== undefined)           updateData.calendar_id            = calendarId;
    if (statusRemark !== undefined)         updateData.status_remark          = statusRemark;
    if (eaReviewResult !== undefined)       updateData.ea_review_result       = eaReviewResult;
    if (eaReviewRemark !== undefined)       updateData.ea_review_remark       = eaReviewRemark;
    if (emailCC !== undefined)              updateData.email_cc               = emailCC;
    if (updatedBy !== undefined)            updateData.update_by              = updatedBy;
    if (requestId !== undefined)            updateData.request_id             = requestId;

    const updated = await prisma.eam_meetings.update({
      where: { id: existing.id },
      data: updateData,
    });

    res.json(mapMeeting(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

export { router as meetingRoutes };
