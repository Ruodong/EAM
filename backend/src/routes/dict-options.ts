import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// GET /api/dict-options?categoryId= — Get dropdown options by category
router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, lang } = req.query;
    const where: any = {};
    if (categoryId) where.category_id = parseInt(categoryId as string);
    if (lang)       where.lang = lang as string;
    else            where.lang = 'en'; // default to English

    const data = await prisma.dict_option.findMany({
      where,
      orderBy: { option_id: 'asc' },
    });

    res.json(data.map(d => ({
      categoryId:  d.category_id,
      optionId:    d.option_id,
      option:      d.option,
      lang:        d.lang,
      description: d.description,
      status:      d.status,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dict options' });
  }
});

// GET /api/dict-options/categories — Get all distinct categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.dict_option.findMany({
      where: { lang: 'en' },
      distinct: ['category_id'],
      select: { category_id: true, description: true },
      orderBy: { category_id: 'asc' },
    });

    res.json(data.map(d => ({
      categoryId: d.category_id,
      description: d.description,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export { router as dictOptionRoutes };
