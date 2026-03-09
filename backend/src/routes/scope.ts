import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPaginationParams, buildPaginatedResponse } from '../middleware/pagination';

const prisma = new PrismaClient();
const router = Router();

// ─── Scope of Change ─────────────────────────────────────────────

function mapScopeOfChange(s: any) {
  return {
    id:                   s.id,
    projectId:            s.project_id,
    scopeNo:              Number(s.scope_no),
    title:                s.title,
    description:          s.description,
    createUsingTemplate:  s.create_using_template,
    sample:               s.sample,
  };
}

router.get('/scope-of-change', async (req: Request, res: Response) => {
  try {
    const { projectId, requestId } = req.query;
    const where: any = {};
    if (projectId) where.project_id = projectId as string;
    // requestId maps through project — filter by project_id associated with request
    if (requestId) {
      const request = await prisma.eam_request.findFirst({ where: { request_id: requestId as string } });
      if (request) where.project_id = request.project_id;
    }

    const data = await prisma.eam_scope_of_change.findMany({
      where,
      orderBy: { scope_no: 'asc' },
    });
    res.json(data.map(mapScopeOfChange));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch scope of change' });
  }
});

router.post('/scope-of-change', async (req: Request, res: Response) => {
  try {
    const { projectId, title, description, createUsingTemplate, sample } = req.body;
    if (!projectId || !title || !description) {
      return res.status(400).json({ error: 'projectId, title, description required' });
    }
    const created = await prisma.eam_scope_of_change.create({
      data: {
        project_id:            projectId,
        title,
        description,
        create_using_template: createUsingTemplate ?? '',
        sample:                sample ?? '',
      },
    });
    res.status(201).json(mapScopeOfChange(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create scope of change' });
  }
});

router.put('/scope-of-change/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, createUsingTemplate, sample } = req.body;
    const updateData: any = {};
    if (title !== undefined)                updateData.title = title;
    if (description !== undefined)          updateData.description = description;
    if (createUsingTemplate !== undefined)  updateData.create_using_template = createUsingTemplate;
    if (sample !== undefined)               updateData.sample = sample;

    const updated = await prisma.eam_scope_of_change.update({
      where: { id: req.params.id as string },
      data: updateData,
    });
    res.json(mapScopeOfChange(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update scope of change' });
  }
});

router.delete('/scope-of-change/:id', async (req: Request, res: Response) => {
  try {
    await prisma.eam_scope_of_change.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Scope of change deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete scope of change' });
  }
});

// ─── Scope of Change Pages (sub-items) ──────────────────────────

router.get('/scope-of-change/:id/pages', async (req: Request, res: Response) => {
  try {
    const data = await prisma.eam_scope_of_change_pages.findMany({
      where: { scope_of_change_id: req.params.id as string },
    });
    res.json(data.map(p => ({
      id: p.id, scopeOfChangeId: p.scope_of_change_id,
      name: p.name, description: p.description, diagram: p.diagram,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch scope pages' });
  }
});

// ─── Scope Check List ────────────────────────────────────────────

function mapCheckList(c: any) {
  return {
    id:          c.id,
    checklistNo: c.checklist_no,
    projectId:   c.project_id,
    category:    c.category,
    subCategory: c.sub_category,
    questions:   c.questions,
    answer:      c.answer,
    option:      c.option,
    comment:     c.comment,
    link:        c.link,
  };
}

router.get('/scope-check-list', async (req: Request, res: Response) => {
  try {
    const { projectId, requestId } = req.query;
    const where: any = {};
    if (projectId) where.project_id = projectId as string;
    if (requestId) {
      const request = await prisma.eam_request.findFirst({ where: { request_id: requestId as string } });
      if (request) where.project_id = request.project_id;
    }

    const data = await prisma.eam_scope_check_list.findMany({
      where,
      orderBy: { checklist_no: 'asc' },
    });
    res.json(data.map(mapCheckList));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch scope check list' });
  }
});

router.post('/scope-check-list', async (req: Request, res: Response) => {
  try {
    const { projectId, checklistNo, category, subCategory, questions, answer, option, comment, link } = req.body;
    if (!projectId || checklistNo === undefined || !category) {
      return res.status(400).json({ error: 'projectId, checklistNo, category required' });
    }
    const created = await prisma.eam_scope_check_list.create({
      data: {
        project_id:   projectId,
        checklist_no: checklistNo,
        category,
        sub_category: subCategory ?? null,
        questions:    questions ?? null,
        answer:       answer ?? null,
        option:       option ?? null,
        comment:      comment ?? null,
        link:         link ?? [],
      },
    });
    res.status(201).json(mapCheckList(created));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create scope check list item' });
  }
});

router.put('/scope-check-list/:id', async (req: Request, res: Response) => {
  try {
    const { answer, option, comment, link } = req.body;
    const updateData: any = {};
    if (answer !== undefined)  updateData.answer  = answer;
    if (option !== undefined)  updateData.option  = option;
    if (comment !== undefined) updateData.comment = comment;
    if (link !== undefined)    updateData.link    = link;

    const updated = await prisma.eam_scope_check_list.update({
      where: { id: req.params.id as string },
      data: updateData,
    });
    res.json(mapCheckList(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update scope check list item' });
  }
});

// ─── Templates ───────────────────────────────────────────────────

router.get('/scope-of-change-templates', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.eam_scope_of_change_template.findMany({ orderBy: { scope_no: 'asc' } });
    res.json(data.map(t => ({
      id: t.id, scopeNo: Number(t.scope_no), title: t.title,
      description: t.description, createUsingTemplate: t.create_using_template, sample: t.sample,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch scope templates' });
  }
});

router.get('/scope-check-list-templates', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.eam_scope_check_list_template.findMany({ orderBy: { checklist_no: 'asc' } });
    res.json(data.map(t => ({
      id: t.id, checklistNo: t.checklist_no, category: t.category,
      subCategory: t.sub_category, questions: t.questions, answer: t.answer,
      option: t.option, comment: t.comment, link: t.link,
      answerType: t.answer_type, selectionType: t.selection_type,
      selectionOption: t.selection_option,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch check list templates' });
  }
});

export { router as scopeRoutes };
