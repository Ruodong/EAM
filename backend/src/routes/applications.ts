import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapApp(a: any) {
  return {
    id:              a.id,
    appId:           a.app_id,
    projectId:       a.project_id,
    appName:         a.app_name,
    appFullName:     a.app_full_name,
    appItOwner:      a.app_it_owner,
    currentState:    a.current_state,
    appTechIdInCmdb: a.app_tech_id_in_cmdb,
    appDescription:  a.app_description,
    businessFunction: a.business_function,
    createdBy:       a.create_by,
    createdAt:       a.create_at,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { appId, name, projectId } = req.query;

    const where: any = {};
    if (appId)     where.app_id      = { contains: appId as string, mode: 'insensitive' };
    if (name)      where.app_name    = { contains: name as string, mode: 'insensitive' };
    if (projectId) where.project_id  = projectId as string;

    const fieldMap: Record<string, string> = { appId: 'app_id', name: 'app_name' };
    const dbSortField = sortField ? (fieldMap[sortField as string] || (sortField as string)) : 'app_id';
    const orderBy: any = { [dbSortField]: sortOrder || 'asc' };

    const [data, total] = await Promise.all([
      prisma.project_app.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.project_app.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data.map(mapApp), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * GET /bcm - Business Capability Mapping view
 * joins biz_cap_map → bcpf_master_data (app info from biz_cap_map, optionally project_app)
 */
router.get('/bcm', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, skip } = getPaginationParams(req);
    const { appId, name, domainL1, subDomainL2, bcName, version } = req.query;

    const conditions: string[] = [];
    if (appId)       conditions.push(`b.app_id ILIKE '%${(appId as string).replace(/'/g, "''")}%'`);
    if (name)        conditions.push(`COALESCE(NULLIF(a.app_name,''), c.name, '') ILIKE '%${(name as string).replace(/'/g, "''")}%'`);
    if (domainL1)    conditions.push(`m.lv1_domain ILIKE '%${(domainL1 as string).replace(/'/g, "''")}%'`);
    if (subDomainL2) conditions.push(`m.lv2_sub_domain ILIKE '%${(subDomainL2 as string).replace(/'/g, "''")}%'`);
    if (bcName)      conditions.push(`m.bc_name ILIKE '%${(bcName as string).replace(/'/g, "''")}%'`);
    if (version)     conditions.push(`m.data_version = '${(version as string).replace(/'/g, "''")}'`);

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const appJoins = `LEFT JOIN eam.project_app a ON b.app_id = a.app_id
       LEFT JOIN eam.cmdb_application c ON b.app_id = c.app_id`;

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT count(*) as count
       FROM eam.biz_cap_map b
       JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id
       ${appJoins}
       ${whereClause}`
    );
    const total = Number(countResult[0].count);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT b.id, b.app_id,
              COALESCE(NULLIF(a.app_name,''), c.name, '') as app_name,
              COALESCE(NULLIF(a.app_it_owner,''), c.app_it_owner, '') as app_it_owner,
              COALESCE(NULLIF(a.current_state,''), c.u_status, '') as current_state,
              COALESCE(NULLIF(a.app_ownership,''), c.app_ownership, '') as app_ownership,
              COALESCE(NULLIF(a.app_solution_owner,''), c.owned_by, '') as app_solution_owner,
              COALESCE(NULLIF(a.portfolio_mgt,''), c.portfolio_mgt, '') as portfolio_mgt,
              COALESCE(NULLIF(a.app_solution_type,''), c.app_solution_type, '') as app_solution_type,
              COALESCE(NULLIF(a.app_classification,''), c.app_classification, '') as app_classification,
              COALESCE(a.business_function, '') as business_function,
              COALESCE(c.app_full_name, '') as app_full_name,
              COALESCE(c.owned_by, '') as owned_by,
              COALESCE(c.app_owner_tower, '') as app_owner_tower,
              COALESCE(c.app_owner_domain, '') as app_owner_domain,
              COALESCE(c.app_dt_owner, '') as app_dt_owner,
              COALESCE(c.app_operation_owner, '') as app_operation_owner,
              m.bc_id, m.bc_name, m.lv1_domain, m.lv2_sub_domain,
              m.lv3_capability_group, m.data_version, m.level
       FROM eam.biz_cap_map b
       JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id
       ${appJoins}
       ${whereClause}
       ORDER BY b.app_id ASC, m.bc_id ASC
       LIMIT ${pageSize} OFFSET ${skip}`
    );

    const mapped = rows.map((r: any) => ({
      id:               r.id,
      appId:            r.app_id,
      appName:          r.app_name || '',
      appFullName:      r.app_full_name || '',
      appItOwner:       r.app_it_owner || '',
      status:           r.current_state || '',
      appOwnership:     r.app_ownership || '',
      appSolutionOwner: r.app_solution_owner || '',
      ownedBy:          r.owned_by || '',
      portfolioMgt:     r.portfolio_mgt || '',
      appSolutionType:  r.app_solution_type || '',
      appClassification: r.app_classification || '',
      businessFunction: r.business_function || '',
      appOwnerTower:    r.app_owner_tower || '',
      appOwnerDomain:   r.app_owner_domain || '',
      appDtOwner:       r.app_dt_owner || '',
      appOperationOwner: r.app_operation_owner || '',
      bcId:             r.bc_id,
      bcName:           r.bc_name,
      domainL1:         r.lv1_domain,
      subDomainL2:      r.lv2_sub_domain,
      capGroupL3:       r.lv3_capability_group,
      version:          r.data_version,
      level:            r.level,
    }));

    res.json(buildPaginatedResponse(mapped, total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch BCM data' });
  }
});

/**
 * POST /bcm - Add BCM mapping(s)
 * Body: { appId, bcpfMasterIds: number[] }  — matches original system
 */
router.post('/bcm', async (req: Request, res: Response) => {
  try {
    const { appId, bcpfMasterIds } = req.body;
    if (!appId || !bcpfMasterIds || !Array.isArray(bcpfMasterIds) || bcpfMasterIds.length === 0) {
      return res.status(400).json({ error: 'appId and bcpfMasterIds[] are required' });
    }

    const inserted: string[] = [];
    const duplicates: number[] = [];

    for (const mid of bcpfMasterIds) {
      try {
        const result = await prisma.$queryRawUnsafe<any[]>(
          `INSERT INTO eam.biz_cap_map (id, app_id, bcpf_master_id, create_by, create_at, update_by, update_at)
           VALUES (gen_random_uuid(), $1, $2, 'system', NOW(), 'system', NOW())
           RETURNING id`,
          appId,
          parseInt(String(mid))
        );
        inserted.push(result[0]?.id);
      } catch (e: any) {
        if (e.code === '23505' || e.message?.includes('unique')) {
          duplicates.push(mid);
        } else {
          throw e;
        }
      }
    }

    res.json({ success: true, inserted: inserted.length, duplicates: duplicates.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create BCM mapping' });
  }
});

/**
 * DELETE /bcm/:id - Delete a BCM mapping
 */
router.delete('/bcm/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.$queryRawUnsafe(
      `DELETE FROM eam.biz_cap_map WHERE id = $1`,
      id
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete BCM mapping' });
  }
});

/**
 * GET /bcm/versions - List distinct BCPF data versions
 */
router.get('/bcm/versions', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT DISTINCT data_version FROM eam.bcpf_master_data ORDER BY data_version DESC`
    );
    res.json(rows.map((r: any) => r.data_version));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

/**
 * GET /bcm/bc-tree?version=&q= - BCPF master data for cascader / search
 * Returns hierarchical tree (L1 → L2 → L3) for the given version
 */
router.get('/bcm/bc-tree', async (req: Request, res: Response) => {
  try {
    const { version, q } = req.query;
    const conditions: string[] = [];
    if (version) conditions.push(`data_version = '${(version as string).replace(/'/g, "''")}'`);
    if (q) {
      const s = (q as string).replace(/'/g, "''");
      conditions.push(`(bc_id ILIKE '%${s}%' OR bc_name ILIKE '%${s}%' OR lv1_domain ILIKE '%${s}%' OR lv2_sub_domain ILIKE '%${s}%' OR lv3_capability_group ILIKE '%${s}%')`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, bc_id, bc_name, lv1_domain, lv2_sub_domain, lv3_capability_group, data_version, level
       FROM eam.bcpf_master_data
       ${whereClause}
       ORDER BY bc_id ASC
       LIMIT 500`
    );

    res.json(rows.map((r: any) => ({
      id:          Number(r.id),
      bcId:        r.bc_id,
      bcName:      r.bc_name,
      domainL1:    r.lv1_domain,
      subDomainL2: r.lv2_sub_domain,
      capGroupL3:  r.lv3_capability_group,
      version:     r.data_version,
      level:       r.level,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch BC tree data' });
  }
});

/**
 * GET /bcm/visualization - BCM data in visualization-ready format
 * Returns { capabilities, applications, mappings, domains, dataVersion }
 * for the mindmap / dashboard views
 */
router.get('/bcm/visualization', async (req: Request, res: Response) => {
  try {
    const { version } = req.query;
    const versionFilter = version
      ? `WHERE m.data_version = '${(version as string).replace(/'/g, "''")}'`
      : '';

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT b.app_id,
              COALESCE(NULLIF(a.app_name,''), c.name, b.app_id) as app_name,
              COALESCE(c.app_full_name, '') as app_full_name,
              COALESCE(NULLIF(a.app_ownership,''), c.app_ownership, '') as app_ownership,
              COALESCE(NULLIF(a.app_solution_owner,''), c.owned_by, '') as app_solution_owner,
              COALESCE(NULLIF(a.app_it_owner,''), c.app_it_owner, '') as app_it_owner,
              COALESCE(NULLIF(a.portfolio_mgt,''), c.portfolio_mgt, '') as portfolio_mgt,
              COALESCE(NULLIF(a.app_solution_type,''), c.app_solution_type, '') as app_solution_type,
              COALESCE(NULLIF(a.app_classification,''), c.app_classification, '') as app_classification,
              COALESCE(NULLIF(a.current_state,''), c.u_status, '') as app_status,
              COALESCE(a.business_function, '') as biz_function,
              COALESCE(c.owned_by, '') as owned_by,
              COALESCE(c.app_owner_tower, '') as app_owner_tower,
              COALESCE(c.app_owner_domain, '') as app_owner_domain,
              COALESCE(c.app_dt_owner, '') as app_dt_owner,
              COALESCE(m.geo, '') as geo,
              m.bc_id, m.bc_name,
              COALESCE(m.bc_name_cn, '') as bc_name_cn,
              m.lv1_domain, m.lv2_sub_domain, m.lv3_capability_group,
              COALESCE(m.parent_bc_id, '') as parent_bc_id,
              COALESCE(m.bc_description, '') as bc_description,
              m.level, m.data_version
       FROM eam.biz_cap_map b
       JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id
       LEFT JOIN eam.project_app a ON b.app_id = a.app_id
       LEFT JOIN eam.cmdb_application c ON b.app_id = c.app_id
       ${versionFilter}
       ORDER BY m.lv1_domain, m.lv2_sub_domain, m.bc_id, b.app_id`
    );

    if (rows.length === 0) {
      return res.json({ capabilities: [], applications: [], mappings: [], domains: [], dataVersion: '' });
    }

    const validRows = rows.filter((r: any) => r.lv1_domain && r.bc_id);

    const l1DomainNames = [...new Set(validRows.map((r: any) => r.lv1_domain))].sort();

    const collectApps = (subset: any[]) => {
      const seen = new Set<string>();
      const result: any[] = [];
      for (const r of subset) {
        if (!seen.has(r.app_id)) {
          seen.add(r.app_id);
          result.push({ id: r.app_id, name: r.app_name, status: r.app_status, geo: r.geo || '', portfolioMgt: r.portfolio_mgt || '' });
        }
      }
      return result;
    };

    const l1Nodes = l1DomainNames.map((domain: string) => ({
      id: `L1-${domain}`, name: domain, nameCn: '', level: 1,
      parentId: null, domain, description: '', appCount: 0, applications: [],
    }));

    const l2PairSet = new Set<string>();
    const l2Pairs: { domain: string; subDomain: string; parentBcId: string }[] = [];
    for (const r of validRows) {
      const key = `${r.lv1_domain}|${r.lv2_sub_domain}`;
      if (!l2PairSet.has(key)) {
        l2PairSet.add(key);
        l2Pairs.push({ domain: r.lv1_domain, subDomain: r.lv2_sub_domain, parentBcId: r.parent_bc_id || '' });
      }
    }

    const l2Nodes = l2Pairs.map((pair) => ({
      id: pair.parentBcId || `L2-${pair.domain}-${pair.subDomain}`,
      name: pair.subDomain, nameCn: '', level: 2,
      parentId: `L1-${pair.domain}`, domain: pair.domain,
      description: '', appCount: 0, applications: [],
    }));

    const l3Seen = new Set<string>();
    const l3Nodes: any[] = [];
    for (const row of validRows) {
      if (l3Seen.has(row.bc_id)) continue;
      l3Seen.add(row.bc_id);
      const bcRows = validRows.filter((r: any) => r.bc_id === row.bc_id);
      const apps = collectApps(bcRows);
      const l2Parent = l2Nodes.find((n) => n.domain === row.lv1_domain && n.name === row.lv2_sub_domain);
      l3Nodes.push({
        id: row.bc_id, name: row.bc_name, nameCn: row.bc_name_cn || '',
        level: 3, parentId: l2Parent?.id ?? null, domain: row.lv1_domain,
        description: row.bc_description || '', appCount: apps.length, applications: apps,
      });
    }

    const appSeen = new Set<string>();
    const applications: any[] = [];
    for (const row of validRows) {
      if (appSeen.has(row.app_id)) continue;
      appSeen.add(row.app_id);
      const appRows = validRows.filter((r: any) => r.app_id === row.app_id);
      const capSet = new Set<string>();
      const capabilities: any[] = [];
      for (const r of appRows) {
        if (!capSet.has(r.bc_id)) {
          capSet.add(r.bc_id);
          capabilities.push({
            bcId: r.bc_id, bcName: r.bc_name, lv1Domain: r.lv1_domain,
            lv2SubDomain: r.lv2_sub_domain, lv3CapGroup: r.lv3_capability_group,
          });
        }
      }
      applications.push({
        appId: row.app_id, appName: row.app_name, appFullName: row.app_full_name || '',
        appOwnership: row.app_ownership,
        appSolutionOwner: row.app_solution_owner, appItOwner: row.app_it_owner,
        ownedBy: row.owned_by || '', appOwnerTower: row.app_owner_tower || '',
        appOwnerDomain: row.app_owner_domain || '', appDtOwner: row.app_dt_owner || '',
        portfolioMgt: row.portfolio_mgt, appSolutionType: row.app_solution_type,
        appClassification: row.app_classification, appStatus: row.app_status,
        bizFunction: row.biz_function, geo: row.geo, capabilities,
      });
    }

    const mappingSet = new Set<string>();
    const mappings: any[] = [];
    for (const r of validRows) {
      const key = `${r.app_id}|${r.bc_id}`;
      if (!mappingSet.has(key)) { mappingSet.add(key); mappings.push({ appId: r.app_id, bcId: r.bc_id }); }
    }

    res.json({
      capabilities: [...l1Nodes, ...l2Nodes, ...l3Nodes],
      applications, mappings, domains: l1DomainNames,
      dataVersion: validRows[0]?.data_version || '',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch BCM visualization data' });
  }
});

export { router as applicationRoutes };
