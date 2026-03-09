import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapProject(p: any) {
  return {
    id:                p.id,
    projectId:         p.project_id,
    name:              p.project_name,
    projectName:       p.project_name,
    type:              p.type,
    startDate:         p.start_date,
    goLiveDate:        p.go_live_date,
    ppsExitDate:       p.pps_exit_date,
    endDate:           p.end_date,
    pmName:            p.pm,
    pm:                p.pm,
    pmItcode:          p.pm_itcode,
    dtLeadName:        p.dt_lead,
    dtLead:            p.dt_lead,
    dtLeadItcode:      p.dt_lead_itcode,
    itLeadName:        p.it_lead,
    itLead:            p.it_lead,
    itLeadItcode:      p.it_lead_itcode,
    duration:          p.duration,
    objectives:        p.objectives,
    investmentCost:    p.investment_cost,
    yearlyMaCost:      p.yearly_ma_cost,
    currency:          p.currency,
    expectedManDays:   p.expected_man_days,
    status:            p.status,
    comment:           p.comment,
    eaReviewType:      p.ea_review_type,
    domainEaReviewer:  p.domain_ea_reviewer,
    favourite:         p.favourite,
    overallStatus:     p.overall_status,
    approvedTime:      p.approved_time,
    source:            p.source,
    eaApprovalDt:      p.ea_approval_dt,
    aiRelated:         p.ai_related,
    createdBy:         p.create_by,
    createdAt:         p.create_at,
    updatedAt:         p.update_at,
  };
}

// GET /api/projects — List with pagination, filtering, sorting
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { projectId, name, itCode, requestStatus, aiRelated } = req.query;

    const where: any = {};
    if (projectId)     where.project_id   = { contains: projectId as string, mode: 'insensitive' };
    if (name)          where.project_name = { contains: name as string, mode: 'insensitive' };
    if (itCode)        where.it_lead      = { contains: itCode as string, mode: 'insensitive' };
    if (requestStatus) where.status       = requestStatus as string;
    if (aiRelated)     where.ai_related   = aiRelated === 'true' ? 'Yes' : 'No';

    const fieldMap: Record<string, string> = {
      projectId:  'project_id',
      name:       'project_name',
      pmName:     'pm',
      dtLeadName: 'dt_lead',
      itLeadName: 'it_lead',
      createdAt:  'create_at',
      aiRelated:  'ai_related',
    };
    const dbSortField = sortField ? (fieldMap[sortField] || sortField) : 'project_id';
    const orderBy: any = { [dbSortField]: sortOrder || 'desc' };

    const [data, total] = await Promise.all([
      prisma.project.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.project.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data.map(mapProject), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id — Get single project by project_id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findFirst({ where: { project_id: req.params.id as string } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(mapProject(project));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects — Create new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      projectName, type, startDate, goLiveDate, ppsExitDate, endDate,
      pm, pmItcode, dtLead, dtLeadItcode, itLead, itLeadItcode,
      duration, objectives, investmentCost, yearlyMaCost, currency,
      expectedManDays, comment, eaReviewType, domainEaReviewer,
      aiRelated, source, createdBy,
    } = req.body;

    const project = await prisma.project.create({
      data: {
        project_name:       projectName ?? null,
        type:               type ?? null,
        start_date:         startDate ?? null,
        go_live_date:       goLiveDate ?? null,
        pps_exit_date:      ppsExitDate ?? null,
        end_date:           endDate ?? null,
        pm:                 pm ?? null,
        pm_itcode:          pmItcode ?? null,
        dt_lead:            dtLead ?? null,
        dt_lead_itcode:     dtLeadItcode ?? null,
        it_lead:            itLead ?? null,
        it_lead_itcode:     itLeadItcode ?? null,
        duration:           duration ?? null,
        objectives:         objectives ?? null,
        investment_cost:    investmentCost ?? null,
        yearly_ma_cost:     yearlyMaCost ?? null,
        currency:           currency ?? null,
        expected_man_days:  expectedManDays ?? null,
        status:             'Active',
        comment:            comment ?? null,
        ea_review_type:     eaReviewType ?? null,
        domain_ea_reviewer: domainEaReviewer ?? null,
        ai_related:         aiRelated ?? null,
        source:             source ?? null,
        create_by:          createdBy ?? null,
      },
    });

    res.status(201).json(mapProject(project));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id — Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.project.findFirst({ where: { project_id: req.params.id as string } });
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const {
      projectName, type, startDate, goLiveDate, ppsExitDate, endDate,
      pm, pmItcode, dtLead, dtLeadItcode, itLead, itLeadItcode,
      duration, objectives, investmentCost, yearlyMaCost, currency,
      expectedManDays, status, comment, eaReviewType, domainEaReviewer,
      favourite, overallStatus, aiRelated, source, updatedBy,
    } = req.body;

    const updateData: any = { update_at: new Date() };
    if (projectName !== undefined)       updateData.project_name       = projectName;
    if (type !== undefined)              updateData.type               = type;
    if (startDate !== undefined)         updateData.start_date         = startDate;
    if (goLiveDate !== undefined)        updateData.go_live_date       = goLiveDate;
    if (ppsExitDate !== undefined)       updateData.pps_exit_date      = ppsExitDate;
    if (endDate !== undefined)           updateData.end_date           = endDate;
    if (pm !== undefined)                updateData.pm                 = pm;
    if (pmItcode !== undefined)          updateData.pm_itcode          = pmItcode;
    if (dtLead !== undefined)            updateData.dt_lead            = dtLead;
    if (dtLeadItcode !== undefined)      updateData.dt_lead_itcode     = dtLeadItcode;
    if (itLead !== undefined)            updateData.it_lead            = itLead;
    if (itLeadItcode !== undefined)      updateData.it_lead_itcode     = itLeadItcode;
    if (duration !== undefined)          updateData.duration           = duration;
    if (objectives !== undefined)        updateData.objectives         = objectives;
    if (investmentCost !== undefined)    updateData.investment_cost    = investmentCost;
    if (yearlyMaCost !== undefined)      updateData.yearly_ma_cost     = yearlyMaCost;
    if (currency !== undefined)          updateData.currency           = currency;
    if (expectedManDays !== undefined)   updateData.expected_man_days  = expectedManDays;
    if (status !== undefined)            updateData.status             = status;
    if (comment !== undefined)           updateData.comment            = comment;
    if (eaReviewType !== undefined)      updateData.ea_review_type     = eaReviewType;
    if (domainEaReviewer !== undefined)  updateData.domain_ea_reviewer = domainEaReviewer;
    if (favourite !== undefined)         updateData.favourite          = favourite;
    if (overallStatus !== undefined)     updateData.overall_status     = overallStatus;
    if (aiRelated !== undefined)         updateData.ai_related         = aiRelated;
    if (source !== undefined)            updateData.source             = source;
    if (updatedBy !== undefined)         updateData.update_by          = updatedBy;

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: updateData,
    });

    res.json(mapProject(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

export { router as projectRoutes };
