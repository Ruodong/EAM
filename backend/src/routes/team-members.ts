import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapMember(m: any) {
  return {
    itcode:        m.itcode,
    name:          m.name,
    email:         m.email,
    worker:        m.worker,
    workerType:    m.worker_type,
    country:       m.country,
    location:      m.location,
    primarySkill:  m.primary_skill,
    skillLevel:    m.skill_level,
    jobRole:       m.job_role,
    trackFocal:    m.track_focal,
    managerItcode: m.manager_itcode,
    managerName:   m.manager_name,
    emailOption:   m.email_option,
    eaAdminStatus: m.ea_admin_status,
    tier1Org:      m.tier_1_org,
    tier2Org:      m.tier_2_org,
  };
}

// GET /api/team-members — List BigEA team members
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { itcode, name, workerType, country } = req.query;

    const where: any = {};
    if (itcode)     where.itcode      = { contains: itcode as string, mode: 'insensitive' };
    if (name)       where.name        = { contains: name as string, mode: 'insensitive' };
    if (workerType) where.worker_type = workerType as string;
    if (country)    where.country     = { contains: country as string, mode: 'insensitive' };

    const memFieldMap: Record<string, string> = {
      itcode: 'itcode', name: 'name', email: 'email', country: 'country',
      workerType: 'worker_type', primarySkill: 'primary_skill', jobRole: 'job_role',
    };
    const dbSortField = (sortField && memFieldMap[sortField]) || 'name';
    const orderBy: any = { [dbSortField]: sortOrder || 'asc' };

    const [data, total] = await Promise.all([
      prisma.eam_bigea_team_members.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.eam_bigea_team_members.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data.map(mapMember), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// POST /api/team-members — Add team member
router.post('/', async (req: Request, res: Response) => {
  try {
    const { itcode, name, email, workerType, country, location, primarySkill, skillLevel, jobRole } = req.body;
    if (!itcode) return res.status(400).json({ error: 'itcode is required' });

    const created = await prisma.eam_bigea_team_members.create({
      data: {
        itcode,
        name:          name ?? null,
        email:         email ?? null,
        worker_type:   workerType ?? null,
        country:       country ?? null,
        location:      location ?? null,
        primary_skill: primarySkill ?? null,
        skill_level:   skillLevel ?? null,
        job_role:      jobRole ?? null,
        create_time:   new Date(),
      },
    });

    res.status(201).json(mapMember(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// PUT /api/team-members/:itcode — Update team member
router.put('/:itcode', async (req: Request, res: Response) => {
  try {
    const {
      name, email, workerType, country, location,
      primarySkill, skillLevel, jobRole, emailOption, eaAdminStatus,
    } = req.body;

    const updateData: any = { update_time: new Date() };
    if (name !== undefined)          updateData.name           = name;
    if (email !== undefined)         updateData.email          = email;
    if (workerType !== undefined)    updateData.worker_type    = workerType;
    if (country !== undefined)       updateData.country        = country;
    if (location !== undefined)      updateData.location       = location;
    if (primarySkill !== undefined)  updateData.primary_skill  = primarySkill;
    if (skillLevel !== undefined)    updateData.skill_level    = skillLevel;
    if (jobRole !== undefined)       updateData.job_role       = jobRole;
    if (emailOption !== undefined)   updateData.email_option   = emailOption;
    if (eaAdminStatus !== undefined) updateData.ea_admin_status = eaAdminStatus;

    const updated = await prisma.eam_bigea_team_members.update({
      where: { itcode: req.params.itcode as string },
      data: updateData,
    });

    res.json(mapMember(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// DELETE /api/team-members/:itcode — Remove team member
router.delete('/:itcode', async (req: Request, res: Response) => {
  try {
    await prisma.eam_bigea_team_members.delete({ where: { itcode: req.params.itcode as string } });
    res.json({ message: 'Team member removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

export { router as teamMemberRoutes };
