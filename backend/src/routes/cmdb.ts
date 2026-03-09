import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

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
    appClassification:      r.app_classification ?? '',
    appSolutionType:        r.app_solution_type ?? '',
    serviceArea:            r.u_service_area ?? '',
    patchLevel:             r.patch_level ?? '',
    updateAt:               r.update_at,
    decommissionedAt:       r.decommissioned_at,
  };
}

/**
 * GET / — paginated list with search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req);
    const { appId, name, status, ownerTower, ownedBy, portfolio } = req.query;

    const conditions: string[] = [];
    const esc = (v: string) => v.replace(/'/g, "''");

    if (appId)      conditions.push(`app_id ILIKE '%${esc(appId as string)}%'`);
    if (name)       conditions.push(`(name ILIKE '%${esc(name as string)}%' OR app_full_name ILIKE '%${esc(name as string)}%')`);
    if (status)     conditions.push(`u_status ILIKE '%${esc(status as string)}%'`);
    if (ownerTower) conditions.push(`app_owner_tower ILIKE '%${esc(ownerTower as string)}%'`);
    if (ownedBy)    conditions.push(`owned_by ILIKE '%${esc(ownedBy as string)}%'`);
    if (portfolio)  conditions.push(`portfolio_mgt ILIKE '%${esc(portfolio as string)}%'`);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT count(*) as count FROM eam.cmdb_application ${where}`
    );
    const total = Number(countResult[0].count);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM eam.cmdb_application ${where}
       ORDER BY app_id ASC
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
