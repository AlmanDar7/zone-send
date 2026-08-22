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

    const [
      contactsCount,
      activeCampaigns,
      emailsSentToday,
      repliesCount,
      sentEmails,
      emailEvents,
      recentContacts,
      campaignList
    ] = await Promise.all([
      prisma.contact.count({ where: { user_id: userId } }),
      prisma.campaign.findMany({ where: { user_id: userId, status: 'Running' } }),
      prisma.emailQueue.count({ where: { user_id: userId, status: 'sent', sent_at: { gte: today } } }),
      prisma.contact.count({ where: { user_id: userId, status: 'Replied' } }),
      prisma.emailQueue.findMany({ where: { user_id: userId, status: 'sent' }, select: { id: true } }),
      prisma.emailEvent.findMany({ where: { user_id: userId }, select: { contact_id: true, event_type: true } }),
      prisma.contact.findMany({ where: { user_id: userId }, orderBy: { updated_at: 'desc' }, take: 5 }),
      prisma.campaign.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, take: 5 })
    ]);

    const totalSent = sentEmails.length;
    const uniqueOpens = new Set(emailEvents.filter(e => e.event_type === 'open').map(e => e.contact_id)).size;
    const uniqueClicks = new Set(emailEvents.filter(e => e.event_type === 'click').map(e => e.contact_id)).size;

    // Last 7 days chart data
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const sentCount = await prisma.emailQueue.count({
        where: { user_id: userId, status: 'sent', sent_at: { gte: start, lt: end } }
      });
      const openCount = await prisma.emailEvent.count({
        where: { user_id: userId, event_type: 'open', created_at: { gte: start, lt: end } }
      });

      chartData.push({
        date: start.toLocaleDateString("en", { weekday: "short" }),
        sent: sentCount,
        replies: openCount // Or rename as needed
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
        openRate: totalSent > 0 ? ((uniqueOpens / totalSent) * 100).toFixed(1) : "0",
        clickRate: totalSent > 0 ? ((uniqueClicks / totalSent) * 100).toFixed(1) : "0"
      },
      recentContacts,
      campaignList,
      chartData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
