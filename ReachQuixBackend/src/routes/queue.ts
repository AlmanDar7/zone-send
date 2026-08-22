import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

// GET /api/queue - list email queue items
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, campaign_id } = req.query;
    const where: any = { user_id: req.user!.uid };
    if (status && status !== 'all') where.status = status as string;
    if (campaign_id && campaign_id !== 'all') where.campaign_id = campaign_id as string;

    const items = await prisma.emailQueue.findMany({
      where,
      include: {
        contact: { select: { name: true, email: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    // Remap for frontend compatibility (expects contacts/campaigns nested keys)
    const mapped = items.map(item => ({
      ...item,
      contacts: item.contact,
      campaigns: item.campaign,
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// PUT /api/queue/:id/retry - retry a failed email
router.put('/:id/retry', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.emailQueue.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    const updated = await prisma.emailQueue.update({
      where: { id: req.params.id },
      data: { status: 'pending', error_message: null }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retry queue item' });
  }
});

// POST /api/queue/bulk - insert queue items in bulk
router.post('/bulk', async (req: AuthRequest, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid input' });

    const data = items.map((item: any) => ({
      ...item,
      user_id: req.user!.uid,
    }));

    const result = await prisma.emailQueue.createMany({ data });
    res.json({ count: result.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create queue items' });
  }
});

export default router;
