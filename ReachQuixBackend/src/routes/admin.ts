import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

// In production you can also verify user is an admin; for now any authenticated admin token
router.use(requireAuth);

// GET /api/admin/stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [
      totalUsers,
      totalCampaigns,
      totalContacts,
      totalEmailsSent,
      pendingQueue,
      activeCampaigns
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.campaign.count(),
      prisma.contact.count(),
      prisma.emailQueue.count({ where: { status: 'sent' } }),
      prisma.emailQueue.count({ where: { status: 'pending' } }),
      prisma.campaign.count({ where: { status: 'Running' } }),
    ]);

    res.json({
      totalUsers,
      totalCampaigns,
      totalContacts,
      totalEmailsSent,
      pendingQueue,
      activeCampaigns,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { created_at: 'desc' },
    });

    const usersWithStats = await Promise.all(
      profiles.map(async (p) => {
        const [campaignCount, contactCount] = await Promise.all([
          prisma.campaign.count({ where: { user_id: p.user_id } }),
          prisma.contact.count({ where: { user_id: p.user_id } }),
        ]);

        return {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          campaignCount,
          contactCount,
        };
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// GET /api/admin/campaigns
router.get('/campaigns', async (req: AuthRequest, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        campaignSteps: { select: { id: true } },
        EmailQueue: { select: { status: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      user_id: c.user_id,
      created_at: c.created_at,
      daily_limit: c.daily_limit,
      stepCount: c.campaignSteps.length,
      queueTotal: c.EmailQueue.length,
      sentTotal: c.EmailQueue.filter((q) => q.status === 'sent').length,
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admin campaigns' });
  }
});

// GET /api/admin/system
router.get('/system', async (req: AuthRequest, res) => {
  try {
    const [
      profileCount,
      contactCount,
      campaignCount,
      templateCount,
      queueCount,
      eventCount,
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.contact.count(),
      prisma.campaign.count(),
      prisma.emailTemplate.count(),
      prisma.emailQueue.count(),
      prisma.emailEvent.count(),
    ]);

    const memory = process.memoryUsage();

    res.json({
      status: 'operational',
      database: 'connected (MySQL)',
      uptime: process.uptime(),
      nodeVersion: process.version,
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      },
      counts: {
        profiles: profileCount,
        contacts: contactCount,
        campaigns: campaignCount,
        templates: templateCount,
        queue: queueCount,
        events: eventCount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch system diagnostics' });
  }
});

export default router;
