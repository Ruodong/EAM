import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// GET /api/meeting-decks?meetingId= — List decks for a meeting
router.get('/', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.query;
    const where: any = {};
    if (meetingId) where.meeting_id = meetingId as string;

    const data = await prisma.eam_meeting_deck.findMany({ where });
    res.json(data.map(d => ({
      id: d.id, meetingId: d.meeting_id, deckName: d.deck_name, deckUrl: d.deck_url,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch meeting decks' });
  }
});

// POST /api/meeting-decks — Add deck reference
router.post('/', async (req: Request, res: Response) => {
  try {
    const { meetingId, deckName, deckUrl } = req.body;
    if (!meetingId || !deckName) {
      return res.status(400).json({ error: 'meetingId and deckName required' });
    }
    const created = await prisma.eam_meeting_deck.create({
      data: { meeting_id: meetingId, deck_name: deckName, deck_url: deckUrl ?? null },
    });
    res.status(201).json({ id: created.id, meetingId: created.meeting_id, deckName: created.deck_name, deckUrl: created.deck_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create meeting deck' });
  }
});

// DELETE /api/meeting-decks/:id — Remove deck
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.eam_meeting_deck.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Meeting deck removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete meeting deck' });
  }
});

export { router as meetingDeckRoutes };
