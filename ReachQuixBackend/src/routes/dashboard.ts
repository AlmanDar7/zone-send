import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Parallel fetch of all stats in a single DB roundtrip batch
    const [
      contactsCount,
      activeCampaigns,
      emailsSentToday,
      repliesCount,
      sentEmails,
      emailEvents,
      recentContacts,
      campaignList,
      recentSentItems,
      recentOpenEvents,
    ] = await Promise.all([
      prisma.contact.count({ where: { user_id: userId } }),
      prisma.campaign.findMany({ where: { user_id: userId, status: 'Running' } }),
      prisma.emailQueue.count({ where: { user_id: userId, status: 'sent', sent_at: { gte: today } } }),
      prisma.contact.count({ where: { user_id: userId, status: 'Replied' } }),
      prisma.emailQueue.findMany({ where: { user_id: userId, status: 'sent' }, select: { id: true } }),
      prisma.emailEvent.findMany({ where: { user_id: userId }, select: { contact_id: true, event_type: true } }),
      prisma.contact.findMany({ where: { user_id: userId }, orderBy: { updated_at: 'desc' }, take: 5 }),
      prisma.campaign.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, take: 5 }),
      prisma.emailQueue.findMany({
        where: { user_id: userId, status: 'sent', sent_at: { gte: sevenDaysAgo } },
        select: { sent_at: true },
      }),
      prisma.emailEvent.findMany({
        where: { user_id: userId, event_type: 'open', created_at: { gte: sevenDaysAgo } },
        select: { created_at: true },
      }),
    ]);

    const totalSent = sentEmails.length;
    const uniqueOpens = new Set(emailEvents.filter((e) => e.event_type === 'open').map((e) => e.contact_id)).size;
    const uniqueClicks = new Set(emailEvents.filter((e) => e.event_type === 'click').map((e) => e.contact_id)).size;

    // Instant in-memory bucketing for 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const sentCount = recentSentItems.filter(
        (s) => s.sent_at && s.sent_at >= start && s.sent_at < end
      ).length;

      const openCount = recentOpenEvents.filter(
        (o) => o.created_at >= start && o.created_at < end
      ).length;

      chartData.push({
        date: start.toLocaleDateString('en', { weekday: 'short' }),
        sent: sentCount,
        replies: openCount,
      });
    }

    res.json({
      contactsCount,
      activeCampaigns,
      emailsSentToday,
      repliesCount,
      engagement: {
        totalSent,
        uniqueOpens,
        uniqueClicks,
        openRate: totalSent > 0 ? ((uniqueOpens / totalSent) * 100).toFixed(1) : '0',
        clickRate: totalSent > 0 ? ((uniqueClicks / totalSent) * 100).toFixed(1) : '0',
      },
      recentContacts,
      campaignList,
      chartData,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
