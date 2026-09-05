import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const campaignId = req.query.campaign as string | undefined;
    const isCampaignFilter = campaignId && campaignId !== 'all';

    const campaignWhere = isCampaignFilter ? { campaign_id: campaignId } : {};
    const contactWhere: any = { user_id: userId };
    if (isCampaignFilter) contactWhere.campaign_id = campaignId;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Run parallel high-speed queries in 1 batch
    const [
      totalSent,
      events,
      replies,
      bounces,
      recentSentItems,
      recentEvents,
      recentContacts,
      allContactsCount,
      topContacts,
      campaigns,
    ] = await Promise.all([
      prisma.emailQueue.count({
        where: { user_id: userId, status: 'sent', ...campaignWhere },
      }),
      prisma.emailEvent.findMany({
        where: { user_id: userId, ...(isCampaignFilter ? { campaign_id: campaignId } : {}) },
        select: { contact_id: true, event_type: true },
      }),
      prisma.contact.count({ where: { ...contactWhere, status: 'Replied' } }),
      prisma.contact.count({ where: { ...contactWhere, status: 'Bounced' } }),
      prisma.emailQueue.findMany({
        where: { user_id: userId, status: 'sent', sent_at: { gte: sevenDaysAgo }, ...campaignWhere },
        select: { sent_at: true },
      }),
      prisma.emailEvent.findMany({
        where: {
          user_id: userId,
          created_at: { gte: sevenDaysAgo },
          ...(isCampaignFilter ? { campaign_id: campaignId } : {}),
        },
        select: { event_type: true, created_at: true },
      }),
      prisma.contact.findMany({
        where: { user_id: userId, created_at: { gte: sevenDaysAgo }, ...campaignWhere },
        select: { created_at: true },
      }),
      prisma.contact.count({
        where: { user_id: userId, created_at: { lt: sevenDaysAgo }, ...campaignWhere },
      }),
      prisma.contact.findMany({
        where: contactWhere,
        orderBy: { updated_at: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, status: true },
      }),
      prisma.campaign.findMany({
        where: { user_id: userId },
        select: { id: true, name: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const opens = events.filter((e) => e.event_type === 'open');
    const clicks = events.filter((e) => e.event_type === 'click');
    const uniqueOpens = new Set(opens.map((e) => e.contact_id)).size;
    const uniqueClicks = new Set(clicks.map((e) => e.contact_id)).size;

    // Instant in-memory bucketing for daily & growth data
    const dailyData = [];
    const growthData = [];
    let runningSubscriberCount = allContactsCount;

    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const sentCount = recentSentItems.filter(
        (s) => s.sent_at && s.sent_at >= start && s.sent_at < end
      ).length;
      const opensCount = recentEvents.filter(
        (e) => e.event_type === 'open' && e.created_at >= start && e.created_at < end
      ).length;
      const clicksCount = recentEvents.filter(
        (e) => e.event_type === 'click' && e.created_at >= start && e.created_at < end
      ).length;

      const newSubscribers = recentContacts.filter(
        (c) => c.created_at >= start && c.created_at < end
      ).length;
      runningSubscriberCount += newSubscribers;

      dailyData.push({
        date: start.toLocaleDateString('en', { weekday: 'short' }),
        sent: sentCount,
        opens: opensCount,
        clicks: clicksCount,
      });

      growthData.push({
        date: start.toLocaleDateString('en', { weekday: 'short' }),
        subscribers: runningSubscriberCount,
        newSubscribers,
      });
    }

    res.json({
      totalSent,
      totalOpens: opens.length,
      uniqueOpens,
      totalClicks: clicks.length,
      uniqueClicks,
      replies,
      bounces,
      openRate: totalSent > 0 ? ((uniqueOpens / totalSent) * 100).toFixed(1) : '0',
      clickRate: totalSent > 0 ? ((uniqueClicks / totalSent) * 100).toFixed(1) : '0',
      replyRate: totalSent > 0 ? ((replies / totalSent) * 100).toFixed(1) : '0',
      bounceRate: totalSent > 0 ? ((bounces / totalSent) * 100).toFixed(1) : '0',
      dailyData,
      growthData,
      topContacts: topContacts.map((c) => ({ ...c, lead_score: 0 })),
      campaigns,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
