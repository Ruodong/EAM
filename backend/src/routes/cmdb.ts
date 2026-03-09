import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

/** Strip PostgreSQL array literal braces, e.g. '{"Business Application"}' → 'Business Application' */
function cleanPgArray(v: unknown): string {
  if (!v) return '';
  const s = String(v);
  if (s.startsWith('{') && s.endsWith('}')) {
    return s.slice(1, -1).replace(/"/g, '');
  }
  return s;
}

function mapRow(r: any) {
  return {
    appId:                  r.app_id ?? '',
    name:                   r.name ?? '',
    appFullName:            r.app_full_name ?? '',
    shortDescription:       r.short_description ?? '',
    status:                 r.u_status ?? '',
    appOwnership:           r.app_ownership ?? '',
    ownedBy:                r.owned_by ?? '',
    appItOwner:             r.app_it_owner ?? '',
    appDtOwner:             r.app_dt_owner ?? '',
    appOperationOwner:      r.app_operation_owner ?? '',
    appOwnerTower:          r.app_owner_tower ?? '',
    appOwnerDomain:         r.app_owner_domain ?? '',
    appOperationOwnerTower: r.app_operation_owner_tower ?? '',
    appOperationOwnerDomain: r.app_operation_owner_domain ?? '',
    portfolioMgt:           r.portfolio_mgt ?? '',
    appClassification:      cleanPgArray(r.app_classification),
    appSolutionType:        cleanPgArray(r.app_solution_type),
    serviceArea:            r.u_service_area ?? '',
    patchLevel:             r.patch_level ?? '',
    updateAt:               r.update_at,
    decommissionedAt:       r.decommissioned_at,
  };
}

/** Map frontend camelCase column keys to DB column names (whitelist for SQL safety) */
const SORT_COLUMNS: Record<string, string> = {
  appId: 'app_id',
  name: 'name',
  appFullName: 'app_full_name',
  status: 'u_status',
  appOwnerTower: 'app_owner_tower',
  ownedBy: 'owned_by',
  portfolioMgt: 'portfolio_mgt',
  appClassification: 'app_classification',
};

/**
 * GET / — paginated list with search & sort
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req);
    const { appId, name, status, ownerTower, ownedBy, portfolio,
            classification, solutionType, serviceArea, ownership,
            sortKey, sortDir } = req.query;

    const conditions: string[] = [];
    const esc = (v: string) => v.replace(/'/g, "''");

    if (appId)           conditions.push(`app_id ILIKE '%${esc(appId as string)}%'`);
    if (name)            conditions.push(`(name ILIKE '%${esc(name as string)}%' OR app_full_name ILIKE '%${esc(name as string)}%')`);
    if (status)          conditions.push(`u_status ILIKE '%${esc(status as string)}%'`);
    if (ownerTower)      conditions.push(`app_owner_tower ILIKE '%${esc(ownerTower as string)}%'`);
    if (ownedBy)         conditions.push(`owned_by ILIKE '%${esc(ownedBy as string)}%'`);
    if (portfolio)       conditions.push(`portfolio_mgt ILIKE '%${esc(portfolio as string)}%'`);
    if (classification)  conditions.push(`app_classification ILIKE '%${esc(classification as string)}%'`);
    if (solutionType)    conditions.push(`app_solution_type ILIKE '%${esc(solutionType as string)}%'`);
    if (serviceArea)     conditions.push(`u_service_area ILIKE '%${esc(serviceArea as string)}%'`);
    if (ownership)       conditions.push(`app_ownership ILIKE '%${esc(ownership as string)}%'`);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const dbCol = SORT_COLUMNS[sortKey as string] ?? 'app_id';
    const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
    const orderBy = `ORDER BY (COALESCE(${dbCol},'') = '') ASC, ${dbCol} ${dir} NULLS LAST`;

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT count(*) as count FROM eam.cmdb_application ${where}`
    );
    const total = Number(countResult[0].count);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM eam.cmdb_application ${where}
       ${orderBy}
       LIMIT ${pageSize} OFFSET ${skip}`
    );

    res.json(buildPaginatedResponse(rows.map(mapRow), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch CMDB applications' });
  }
});

/**
 * GET /:appId — single record detail
 */
router.get('/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM eam.cmdb_application WHERE app_id = $1 LIMIT 1`,
      appId
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(mapRow(rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch application detail' });
  }
});

export const cmdbRoutes = router;
