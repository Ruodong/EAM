import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapResource(r: any) {
  return {
    itcode:     r.itcode,
    name:       r.name,
    email:      r.email,
    worker:     r.worker,
    workerType: r.worker_type,
    country:    r.country,
    location:   r.location,
    tier1Org:   r.tier_1_org,
    tier2Org:   r.tier_2_org,
    tier3Org:   r.tier_3_org,
  };
}

// GET /api/resources — Search resource pool with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { itcode, name, country, tier1Org } = req.query;

    const where: any = {};
    if (itcode)  where.itcode   = { contains: itcode as string, mode: 'insensitive' };
    if (name)    where.name     = { contains: name as string, mode: 'insensitive' };
    if (country) where.country  = { contains: country as string, mode: 'insensitive' };
    if (tier1Org) where.tier_1_org = { contains: tier1Org as string, mode: 'insensitive' };

    const resFieldMap: Record<string, string> = {
      itcode: 'itcode', name: 'name', email: 'email', country: 'country',
      workerType: 'worker_type', tier1Org: 'tier_1_org',
    };
    const dbSortField = (sortField && resFieldMap[sortField]) || 'name';
    const orderBy: any = { [dbSortField]: sortOrder || 'asc' };

    const [data, total] = await Promise.all([
      prisma.resource_pool.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.resource_pool.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data.map(mapResource), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /api/resources/search — Quick search for autocomplete (assignee pickers)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (q.length < 2) return res.json([]);

    const data = await prisma.resource_pool.findMany({
      where: {
        OR: [
          { itcode: { contains: q, mode: 'insensitive' } },
          { name:   { contains: q, mode: 'insensitive' } },
          { email:  { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    res.json(data.map(r => ({
      itcode: r.itcode,
      name:   r.name,
      email:  r.email,
      label:  `${r.name} (${r.itcode})`,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search resources' });
  }
});

export { router as resourceRoutes };
