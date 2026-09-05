import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

// GET /api/queue - list email queue items
router.get('/', async (req: AuthRequest, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const campaign_id = req.query.campaign_id ? String(req.query.campaign_id) : undefined;
    const where: any = { user_id: req.user!.uid };
    if (status && status !== 'all') where.status = status;
    if (campaign_id && campaign_id !== 'all') where.campaign_id = campaign_id;

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
  const id = String(req.params.id);
  try {
    const existing = await prisma.emailQueue.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    const updated = await prisma.emailQueue.update({
      where: { id },
      data: { status: 'pending', error_message: null }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retry queue item' });
  }
});

// POST /api/queue - create a single queue item
router.post('/', async (req: AuthRequest, res) => {
  try {
    const item = await prisma.emailQueue.create({
      data: {
        ...req.body,
        user_id: req.user!.uid,
      },
    });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create queue item' });
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
