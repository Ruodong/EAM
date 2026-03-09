import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// ─── Data Classification ─────────────────────────────────────────

router.get('/data-classification', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.data_classification.findMany({
      orderBy: [{ method: 'asc' }, { sort: 'asc' }],
    });
    res.json(data.map(d => ({
      id: d.id, method: d.method, code: d.code,
      nameZh: d.name_zh, nameEn: d.name_en,
      parent: d.parent, sort: d.sort, status: d.status,
      comment: d.comment, level: d.level,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data classification' });
  }
});

// ─── Data Centers ────────────────────────────────────────────────

router.get('/data-centers', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.data_center.findMany({ orderBy: { name: 'asc' } });
    res.json(data.map(d => ({
      id: d.id, name: d.name, createdBy: d.create_by, createdAt: d.create_at,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data centers' });
  }
});

// ─── Companies ───────────────────────────────────────────────────

router.get('/companies', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { company_code: { contains: search as string, mode: 'insensitive' } },
        { company_name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.company.findMany({ where, orderBy: { company_code: 'asc' } });
    res.json(data.map(c => ({
      id: c.id, companyCode: c.company_code, companyName: c.company_name,
      companyRemark: c.company_remark, s4: c.s4, area: c.area,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// ─── Legal Entities ──────────────────────────────────────────────

router.get('/legal-entities', async (req: Request, res: Response) => {
  try {
    const { appId } = req.query;
    const where: any = {};
    if (appId) where.app_id = appId as string;

    const data = await prisma.application_legal_entity.findMany({ where, orderBy: { create_at: 'desc' } });
    res.json(data.map(e => ({
      id: e.id, appId: e.app_id, companyCode: e.company_code, createdAt: e.create_at,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch legal entities' });
  }
});

// ─── Help Files ──────────────────────────────────────────────────

router.get('/help-files', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.help_file.findMany({ orderBy: { create_at: 'desc' } });
    res.json(data.map(f => ({
      id: f.id, usage: f.usage, fileName: f.file_name,
      filePath: f.file_path, createdBy: f.create_by, createdAt: f.create_at,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch help files' });
  }
});

export { router as masterDataRoutes };
