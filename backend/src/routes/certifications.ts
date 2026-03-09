import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

function mapCert(c: any) {
  return {
    ...c,
    certId: c.simple_id,
    name: c.exam_name,
    type: c.certificate_type,
    itCode: c.itcode,
    issuedDate: c.issue_date,
    expiryDate: c.expiration_date,
    ownerName: c.user_name,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, sortField, sortOrder, skip } = getPaginationParams(req);
    const { name, type, itCode, certId } = req.query;

    const where: any = {};
    if (name) where.exam_name = { contains: name as string, mode: 'insensitive' };
    if (type) where.certificate_type = type as string;
    if (itCode) where.itcode = { contains: itCode as string, mode: 'insensitive' };
    if (certId) where.simple_id = { contains: certId as string, mode: 'insensitive' };

    const certFieldMap: Record<string, string> = {
      certId: 'simple_id', name: 'exam_name', type: 'certificate_type',
      itCode: 'itcode', ownerName: 'user_name', issuedDate: 'issue_date', expiryDate: 'expiration_date',
    };
    const dbSortField = (sortField && certFieldMap[sortField]) || 'id';
    const orderBy: any = { [dbSortField]: sortOrder || 'desc' };

    const [data, total] = await Promise.all([
      prisma.certification.findMany({ where, orderBy, skip, take: pageSize }),
      prisma.certification.count({ where }),
    ]);

    res.json(buildPaginatedResponse(data.map(mapCert), total, page, pageSize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

export { router as certificationRoutes };
