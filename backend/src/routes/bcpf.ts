import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { version, domainL1, subDomainL2, bcName, level } = req.query;

    const where: any = {};
    if (version)     where.data_version    = version as string;
    if (domainL1)    where.lv1_domain      = domainL1 as string;
    if (subDomainL2) where.lv2_sub_domain  = subDomainL2 as string;
    if (bcName)      where.bc_name         = { contains: bcName as string, mode: 'insensitive' };
    if (level)       where.level           = parseInt(level as string);

    const fieldMap: Record<string, string> = {
      bcId: 'bc_id', bcName: 'bc_name', domainL1: 'lv1_domain',
      subDomainL2: 'lv2_sub_domain', version: 'data_version',
    };
    const dbSortField = sortField ? (fieldMap[sortField as string] || (sortField as string)) : 'bc_id';
    const orderBy: any = { [dbSortField]: sortOrder || 'asc' };

    const [data, total] = await Promise.all([
      prisma.bcpf_master_data.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.bcpf_master_data.count({ where }),
    ]);

    // BigInt id must be converted to string/number for JSON serialization
    const mapped = data.map((d) => ({
      id:                Number(d.id),
      bcId:              d.bc_id,
      parentBcId:        d.parent_bc_id,
      bcName:            d.bc_name,
      bcNameCn:          d.bc_name_cn,
      level:             d.level,
      alias:             d.alias,
      bcDescription:     d.bc_description,
      bizGroup:          d.biz_group,
      geo:               d.geo,
      bizOwner:          d.biz_owner,
      bizTeam:           d.biz_team,
      dtOwner:           d.dt_owner,
      dtTeam:            d.dt_team,
      remark:            d.remark,
      version:           d.data_version,
      domainL1:          d.lv1_domain,
      subDomainL2:       d.lv2_sub_domain,
      capabilityGroupL3: d.lv3_capability_group,
      createTime:        d.create_time,
    }));

    res.json(buildPaginatedResponse(mapped, total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch BCPF master data' });
  }
});

export { router as bcpfRoutes };
