import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const campaignId = req.query.campaign as string | undefined;

    const campaignWhere = campaignId && campaignId !== 'all' ? { campaign_id: campaignId } : {};

    // Sent count
    const totalSent = await prisma.emailQueue.count({
      where: { user_id: userId, status: 'sent', ...campaignWhere }
    });

    // Events
    const events = await prisma.emailEvent.findMany({
      where: { user_id: userId, ...(campaignId && campaignId !== 'all' ? { campaign_id: campaignId } : {}) },
      select: { contact_id: true, event_type: true }
    });

    const opens = events.filter(e => e.event_type === 'open');
    const clicks = events.filter(e => e.event_type === 'click');
    const uniqueOpens = new Set(opens.map(e => e.contact_id)).size;
    const uniqueClicks = new Set(clicks.map(e => e.contact_id)).size;

    // Replied / Bounced contacts
    const contactWhere: any = { user_id: userId };
    if (campaignId && campaignId !== 'all') contactWhere.campaign_id = campaignId;

    const replies = await prisma.contact.count({ where: { ...contactWhere, status: 'Replied' } });
    const bounces = await prisma.contact.count({ where: { ...contactWhere, status: 'Bounced' } });

    // Daily data (last 7 days)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const sentCount = await prisma.emailQueue.count({
        where: { user_id: userId, status: 'sent', sent_at: { gte: start, lt: end }, ...campaignWhere }
      });
      const opensCount = await prisma.emailEvent.count({
        where: { user_id: userId, event_type: 'open', created_at: { gte: start, lt: end }, ...(campaignId && campaignId !== 'all' ? { campaign_id: campaignId } : {}) }
      });
      const clicksCount = await prisma.emailEvent.count({
        where: { user_id: userId, event_type: 'click', created_at: { gte: start, lt: end }, ...(campaignId && campaignId !== 'all' ? { campaign_id: campaignId } : {}) }
      });

      dailyData.push({
        date: start.toLocaleDateString("en", { weekday: "short" }),
        sent: sentCount,
        opens: opensCount,
        clicks: clicksCount,
      });
    }

    // Growth data (last 7 days)
    const growthData = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const subscribers = await prisma.contact.count({
        where: { user_id: userId, created_at: { gte: start, lt: end }, ...campaignWhere }
      });
      growthData.push({
        date: start.toLocaleDateString("en", { weekday: "short" }),
        subscribers,
      });
    }

    // Top contacts by lead_score (lead_score doesn't exist in schema yet, return by updated_at)
    const topContacts = await prisma.contact.findMany({
      where: contactWhere,
      orderBy: { updated_at: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, status: true }
    });

    // Campaigns list for filter
    const campaigns = await prisma.campaign.findMany({
      where: { user_id: userId },
      select: { id: true, name: true },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      totalSent,
      totalOpens: opens.length,
      uniqueOpens,
      totalClicks: clicks.length,
      uniqueClicks,
      replies,
      bounces,
      openRate: totalSent > 0 ? ((uniqueOpens / totalSent) * 100).toFixed(1) : "0",
      clickRate: totalSent > 0 ? ((uniqueClicks / totalSent) * 100).toFixed(1) : "0",
      replyRate: totalSent > 0 ? ((replies / totalSent) * 100).toFixed(1) : "0",
      bounceRate: totalSent > 0 ? ((bounces / totalSent) * 100).toFixed(1) : "0",
      dailyData,
      growthData,
      topContacts: topContacts.map(c => ({ ...c, lead_score: 0 })),
      campaigns,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
