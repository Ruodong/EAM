import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapTechStack(t: any) {
  return {
    id:                    t.id,
    masterNo:              t.master_no,
    category:              t.category,
    subCategory:           t.sub_category,
    component:             t.component,
    componentPackage:      t.component_package,
    version:               t.version,
    majorVersion:          t.major_version,
    minorVersion:          t.minor_version,
    patchVersion:          t.patch_version,
    eaAdvice:              t.ea_advice,
    standard:              t.standard,
    restricted:            t.restricted,
    remark:                t.remark,
    initialReleaseDate:    t.initial_release_date,
    finalReleaseDate:      t.final_release_date,
    eolDate:               t.eol_date,
    eolLink:               t.eol_link,
    securityVulnerability: t.security_vulnerability,
    securityServerity:     t.security_serverity,
    cvssV3Score:           t.cvss_v3_score,
    securityAdvice:        t.security_advice,
    vulnerabilityLink:     t.vulnerability_link,
    status:                t.status,
    createdBy:             t.create_by,
    createdAt:             t.create_at,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { component, category, eaAdvice, status } = req.query;

    const where: any = {};
    if (component) where.component = { contains: component as string, mode: 'insensitive' };
    if (category)  where.category  = category as string;
    if (eaAdvice)  where.ea_advice = eaAdvice as string;
    if (status)    where.status    = status as string;

    const fieldMap: Record<string, string> = {
      component: 'component', category: 'category',
      eaAdvice: 'ea_advice', masterNo: 'master_no',
    };
    const dbSortField = sortField ? (fieldMap[sortField as string] || (sortField as string)) : 'master_no';
    const orderBy: any = { [dbSortField]: sortOrder || 'asc' };

    const [data, total] = await Promise.all([
      prisma.tech_stack_master_data.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.tech_stack_master_data.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data.map(mapTechStack), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch technology stack' });
  }
});

export { router as technologyStackRoutes };
