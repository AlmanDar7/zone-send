import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';
import { processPendingQueue } from '../services/queueWorker';

const router = Router();

// Protect all admin endpoints with authentication
router.use(requireAuth);

/**
 * GET /api/admin/stats
 * Overview dashboard metrics across the entire platform
 */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [
      totalUsers,
      totalCampaigns,
      totalContacts,
      totalEmailsSent,
      pendingQueue,
      activeCampaigns,
      failedQueue,
      totalTemplates,
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.campaign.count(),
      prisma.contact.count(),
      prisma.emailQueue.count({ where: { status: 'sent' } }),
      prisma.emailQueue.count({ where: { status: 'pending' } }),
      prisma.campaign.count({ where: { status: 'Running' } }),
      prisma.emailQueue.count({ where: { status: 'failed' } }),
      prisma.emailTemplate.count(),
    ]);

    res.json({
      totalUsers,
      totalCampaigns,
      totalContacts,
      totalEmailsSent,
      pendingQueue,
      activeCampaigns,
      failedQueue,
      totalTemplates,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

/**
 * GET /api/admin/users
 * Lists all users with their campaign & contact volumes
 */
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const search = req.query.search ? String(req.query.search).toLowerCase() : '';
    
    // 1. Fetch profiles and aggregate stats in parallel
    const [profiles, campaignGroups, contactGroups, templateGroups, queueGroups, limits, smtps] =
      await Promise.all([
        prisma.profile.findMany({
          where: search
            ? {
                OR: [
                  { full_name: { contains: search } },
                  { user_id: { contains: search } },
                ],
              }
            : undefined,
          orderBy: { created_at: 'desc' },
        }),
        prisma.campaign.groupBy({
          by: ['user_id'],
          _count: { id: true },
        }),
        prisma.contact.groupBy({
          by: ['user_id'],
          _count: { id: true },
        }),
        prisma.emailTemplate.groupBy({
          by: ['user_id'],
          _count: { id: true },
        }),
        prisma.emailQueue.groupBy({
          by: ['user_id', 'status'],
          _count: { id: true },
        }),
        prisma.sendingLimit.findMany(),
        prisma.smtpSettings.findMany({
          select: { user_id: true, host: true, username: true },
        }),
      ]);

    // 2. Build fast lookup maps (O(1) lookups)
    const campaignMap = new Map(campaignGroups.map((g) => [g.user_id, g._count.id]));
    const contactMap = new Map(contactGroups.map((g) => [g.user_id, g._count.id]));
    const templateMap = new Map(templateGroups.map((g) => [g.user_id, g._count.id]));
    const limitMap = new Map(limits.map((l) => [l.user_id, l]));
    const smtpMap = new Map(smtps.map((s) => [s.user_id, s]));

    const queueMap = new Map<string, { sent: number; pending: number; failed: number }>();
    for (const q of queueGroups) {
      if (!queueMap.has(q.user_id)) {
        queueMap.set(q.user_id, { sent: 0, pending: 0, failed: 0 });
      }
      const entry = queueMap.get(q.user_id)!;
      if (q.status === 'sent') entry.sent += q._count.id;
      else if (q.status === 'pending') entry.pending += q._count.id;
      else if (q.status === 'failed') entry.failed += q._count.id;
    }

    // 3. Construct optimized result array
    const usersWithStats = profiles.map((p) => {
      const q = queueMap.get(p.user_id) || { sent: 0, pending: 0, failed: 0 };
      const limit = limitMap.get(p.user_id);
      const smtp = smtpMap.get(p.user_id);

      return {
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name || 'Unnamed User',
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        campaignCount: campaignMap.get(p.user_id) || 0,
        contactCount: contactMap.get(p.user_id) || 0,
        templateCount: templateMap.get(p.user_id) || 0,
        sentEmails: q.sent,
        pendingEmails: q.pending,
        failedEmails: q.failed,
        hasSmtp: Boolean(smtp?.host && smtp?.username),
        dailyLimit: limit?.max_per_day || 500,
        sentToday: limit?.sent_today || 0,
      };
    });

    res.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

/**
 * GET /api/admin/users/:userId/details
 * Deep-dive full inspector for a specific user's entire dataset
 */
router.get('/users/:userId/details', async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  try {
    const [profile, contacts, campaigns, templates, queue, smtp, sendingLimit] =
      await Promise.all([
        prisma.profile.findUnique({ where: { user_id: userId } }),
        prisma.contact.findMany({
          where: { user_id: userId },
          take: 50,
          orderBy: { created_at: 'desc' },
        }),
        prisma.campaign.findMany({
          where: { user_id: userId },
          include: { campaignSteps: true },
          orderBy: { created_at: 'desc' },
        }),
        prisma.emailTemplate.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
        }),
        prisma.emailQueue.findMany({
          where: { user_id: userId },
          take: 50,
          include: { contact: { select: { email: true, name: true } } },
          orderBy: { created_at: 'desc' },
        }),
        prisma.smtpSettings.findUnique({ where: { user_id: userId } }),
        prisma.sendingLimit.findUnique({ where: { user_id: userId } }),
      ]);

    if (!profile && contacts.length === 0 && campaigns.length === 0) {
      return res.status(404).json({ error: 'User data not found' });
    }

    res.json({
      profile: profile || { user_id: userId, full_name: 'Anonymous User' },
      contacts,
      campaigns,
      templates,
      queue,
      smtp: smtp
        ? {
            host: smtp.host,
            port: smtp.port,
            username: smtp.username,
            from_name: smtp.from_name,
            from_email: smtp.from_email,
            use_ssl: smtp.use_ssl,
          }
        : null,
      sendingLimit: sendingLimit || { max_per_day: 500, sent_today: 0 },
    });
  } catch (error) {
    console.error('Error fetching user deep-dive details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * PUT /api/admin/users/:userId/limits
 * Update sending limit for a user
 */
router.put('/users/:userId/limits', async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  const { max_per_day } = req.body;

  try {
    const updated = await prisma.sendingLimit.upsert({
      where: { user_id: userId },
      update: { max_per_day: Number(max_per_day) || 500 },
      create: {
        user_id: userId,
        max_per_day: Number(max_per_day) || 500,
        sent_today: 0,
        last_reset_date: new Date().toISOString().slice(0, 10),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user limits:', error);
    res.status(500).json({ error: 'Failed to update user limits' });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Wipe all data belonging to a user
 */
router.delete('/users/:userId', async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  try {
    await prisma.$transaction([
      prisma.emailEvent.deleteMany({ where: { user_id: userId } }),
      prisma.emailQueue.deleteMany({ where: { user_id: userId } }),
      prisma.campaignStep.deleteMany({ where: { campaign: { user_id: userId } } }),
      prisma.campaign.deleteMany({ where: { user_id: userId } }),
      prisma.emailTemplate.deleteMany({ where: { user_id: userId } }),
      prisma.contactTag.deleteMany({ where: { contact: { user_id: userId } } }),
      prisma.tag.deleteMany({ where: { user_id: userId } }),
      prisma.contactFolderMember.deleteMany({ where: { contact: { user_id: userId } } }),
      prisma.contactFolder.deleteMany({ where: { user_id: userId } }),
      prisma.contact.deleteMany({ where: { user_id: userId } }),
      prisma.smtpSettings.deleteMany({ where: { user_id: userId } }),
      prisma.sendingLimit.deleteMany({ where: { user_id: userId } }),
      prisma.profile.deleteMany({ where: { user_id: userId } }),
    ]);

    res.json({ success: true, message: `User ${userId} and all associated data deleted.` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/contacts
 * All contacts across the entire platform
 */
router.get('/contacts', async (req: AuthRequest, res) => {
  try {
    const search = req.query.search ? String(req.query.search).toLowerCase() : '';
    const contacts = await prisma.contact.findMany({
      include: {
        tags: { include: { tag: true } },
        folder_members: { include: { folder: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    const filtered = search
      ? contacts.filter(
          (c) =>
            c.email.toLowerCase().includes(search) ||
            (c.name && c.name.toLowerCase().includes(search)) ||
            (c.company_name && c.company_name.toLowerCase().includes(search)) ||
            c.user_id.toLowerCase().includes(search)
        )
      : contacts;

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching admin contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * DELETE /api/admin/contacts/:id
 */
router.delete('/contacts/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    await prisma.contactTag.deleteMany({ where: { contact_id: id } });
    await prisma.contactFolderMember.deleteMany({ where: { contact_id: id } });
    await prisma.emailEvent.deleteMany({ where: { contact_id: id } });
    await prisma.emailQueue.deleteMany({ where: { contact_id: id } });
    await prisma.contact.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

/**
 * GET /api/admin/campaigns
 * All campaigns across the entire platform
 */
router.get('/campaigns', async (req: AuthRequest, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        campaignSteps: {
          include: { template: { select: { name: true } } },
          orderBy: { step_number: 'asc' },
        },
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
      steps: c.campaignSteps,
      stepCount: c.campaignSteps.length,
      queueTotal: c.EmailQueue.length,
      sentTotal: c.EmailQueue.filter((q) => q.status === 'sent').length,
      pendingTotal: c.EmailQueue.filter((q) => q.status === 'pending').length,
      failedTotal: c.EmailQueue.filter((q) => q.status === 'failed').length,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching admin campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch admin campaigns' });
  }
});

/**
 * PUT /api/admin/campaigns/:id/status
 * Admin override status (e.g. pause rogue campaign)
 */
router.put('/campaigns/:id/status', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const { status } = req.body;
  try {
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: String(status) },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

/**
 * DELETE /api/admin/campaigns/:id
 */
router.delete('/campaigns/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    await prisma.emailEvent.deleteMany({ where: { campaign_id: id } });
    await prisma.emailQueue.deleteMany({ where: { campaign_id: id } });
    await prisma.campaignStep.deleteMany({ where: { campaign_id: id } });
    await prisma.campaign.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

/**
 * GET /api/admin/queue
 * Global live queue inspection
 */
router.get('/queue', async (req: AuthRequest, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const queueItems = await prisma.emailQueue.findMany({
      where,
      include: {
        contact: { select: { email: true, name: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { scheduled_at: 'desc' },
      take: 200,
    });

    res.json(queueItems);
  } catch (error) {
    console.error('Error fetching admin queue:', error);
    res.status(500).json({ error: 'Failed to fetch email queue' });
  }
});

/**
 * PUT /api/admin/queue/:id/retry
 */
router.put('/queue/:id/retry', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const updated = await prisma.emailQueue.update({
      where: { id },
      data: { status: 'pending', error_message: null, scheduled_at: new Date() },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error retrying queue item:', error);
    res.status(500).json({ error: 'Failed to retry queue item' });
  }
});

/**
 * DELETE /api/admin/queue/:id
 */
router.delete('/queue/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    await prisma.emailEvent.deleteMany({ where: { email_queue_id: id } });
    await prisma.emailQueue.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting queue item:', error);
    res.status(500).json({ error: 'Failed to delete queue item' });
  }
});

/**
 * GET /api/admin/templates
 * Global email & form template explorer
 */
router.get('/templates', async (req: AuthRequest, res) => {
  try {
    const category = req.query.category ? String(req.query.category) : undefined;
    const where: any = {};
    if (category && category !== 'all') where.category = category;

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching admin templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * DELETE /api/admin/templates/:id
 */
router.delete('/templates/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    await prisma.campaignStep.updateMany({
      where: { template_id: id },
      data: { template_id: null },
    });
    await prisma.emailTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * POST /api/admin/system/trigger-worker
 * Forces an immediate run of the queue dispatcher worker
 */
router.post('/system/trigger-worker', async (req: AuthRequest, res) => {
  try {
    const result = await processPendingQueue();
    res.json({
      success: true,
      message: `Worker executed manually: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`,
      result,
    });
  } catch (error: any) {
    console.error('Error triggering worker:', error);
    res.status(500).json({ error: error.message || 'Failed to execute worker' });
  }
});

/**
 * GET /api/admin/system
 */
router.get('/system', async (req: AuthRequest, res) => {
  try {
    const [
      profileCount,
      contactCount,
      campaignCount,
      templateCount,
      queueCount,
      eventCount,
      pendingQueueCount,
      failedQueueCount,
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.contact.count(),
      prisma.campaign.count(),
      prisma.emailTemplate.count(),
      prisma.emailQueue.count(),
      prisma.emailEvent.count(),
      prisma.emailQueue.count({ where: { status: 'pending' } }),
      prisma.emailQueue.count({ where: { status: 'failed' } }),
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
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      },
      counts: {
        profiles: profileCount,
        contacts: contactCount,
        campaigns: campaignCount,
        templates: templateCount,
        queue: queueCount,
        events: eventCount,
        pendingQueue: pendingQueueCount,
        failedQueue: failedQueueCount,
      },
    });
  } catch (error) {
    console.error('Error fetching system diagnostics:', error);
    res.status(500).json({ error: 'Failed to fetch system diagnostics' });
  }
});

/**
 * Helper to log admin actions
 */
async function logAdminAction(userId: string, action: string, details?: any, ip?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        details: details || {},
        ip_address: ip || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * GET /api/admin/settings
 * Retrieve all global platform settings and feature flags
 */
router.get('/settings', async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {
      maintenanceMode: 'false',
      defaultDailyLimit: '500',
      allowNewSignups: 'true',
      aiCopywritingEnabled: 'true',
      announcementBanner: '',
      announcementType: 'info',
      trackingDomain: '',
    };

    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    res.json(settingsMap);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/admin/settings
 * Update global platform settings
 */
router.put('/settings', async (req: AuthRequest, res) => {
  try {
    const updates: Record<string, string> = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    await logAdminAction(
      req.user?.uid || 'admin',
      'UPDATE_SYSTEM_SETTINGS',
      updates,
      typeof ip === 'string' ? ip.split(',')[0].trim() : undefined
    );

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Real-time audit logs of administrative and critical events
 */
router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const logs = await prisma.auditLog.findMany({
      where: search
        ? {
            OR: [
              { action: { contains: search } },
              { user_id: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/admin/events
 * Real-time telemetry feed of all open, click, and unsubscribe events across the platform
 */
router.get('/events', async (req: AuthRequest, res) => {
  try {
    const type = req.query.type as string | undefined;
    const events = await prisma.emailEvent.findMany({
      where: type && type !== 'all' ? { event_type: type } : undefined,
      include: {
        contact: { select: { email: true, name: true, company_name: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 150,
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching global events:', error);
    res.status(500).json({ error: 'Failed to fetch tracking events' });
  }
});

/**
 * POST /api/admin/contacts
 * Create a new contact under any user's account
 */
router.post('/contacts', async (req: AuthRequest, res) => {
  try {
    const { user_id, email, name, first_name, last_name, company_name, phone, status } = req.body;
    if (!email || !user_id) {
      return res.status(400).json({ error: 'Email and User ID are required' });
    }

    const contact = await prisma.contact.create({
      data: {
        user_id,
        email,
        name: name || `${first_name || ''} ${last_name || ''}`.trim() || null,
        first_name,
        last_name,
        company_name,
        phone,
        status: status || 'active',
      },
    });

    await logAdminAction(req.user?.uid || 'admin', 'CREATE_CONTACT', { contactId: contact.id, user_id });
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * PUT /api/admin/contacts/:id
 * Edit any contact's details directly
 */
router.put('/contacts/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const { email, name, first_name, last_name, company_name, phone, status } = req.body;

  try {
    const updated = await prisma.contact.update({
      where: { id },
      data: {
        email,
        name: name || `${first_name || ''} ${last_name || ''}`.trim() || undefined,
        first_name,
        last_name,
        company_name,
        phone,
        status,
      },
    });

    await logAdminAction(req.user?.uid || 'admin', 'UPDATE_CONTACT', { contactId: id, changes: req.body });
    res.json(updated);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * PUT /api/admin/contacts/bulk-status
 * Bulk change contact status
 */
router.put('/contacts-bulk/status', async (req: AuthRequest, res) => {
  const { contactIds, status } = req.body;
  if (!Array.isArray(contactIds) || !status) {
    return res.status(400).json({ error: 'contactIds array and status are required' });
  }

  try {
    const result = await prisma.contact.updateMany({
      where: { id: { in: contactIds } },
      data: { status },
    });

    await logAdminAction(req.user?.uid || 'admin', 'BULK_UPDATE_CONTACT_STATUS', { count: result.count, status });
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error bulk updating contact status:', error);
    res.status(500).json({ error: 'Failed to update contacts' });
  }
});

/**
 * PUT /api/admin/users/:userId/profile
 * Edit user profile name and avatar
 */
router.put('/users/:userId/profile', async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  const { full_name, avatar_url } = req.body;

  try {
    const updated = await prisma.profile.upsert({
      where: { user_id: userId },
      update: { full_name, avatar_url },
      create: { id: userId, user_id: userId, full_name, avatar_url },
    });

    await logAdminAction(req.user?.uid || 'admin', 'UPDATE_USER_PROFILE', { userId, full_name });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

/**
 * PUT /api/admin/users/:userId/smtp
 * Override or configure SMTP settings for any user
 */
router.put('/users/:userId/smtp', async (req: AuthRequest, res) => {
  const userId = String(req.params.userId);
  const { host, port, username, password, use_ssl, from_name, from_email } = req.body;

  try {
    const updated = await prisma.smtpSettings.upsert({
      where: { user_id: userId },
      update: {
        host,
        port: Number(port) || 587,
        username,
        password,
        use_ssl: Boolean(use_ssl),
        from_name,
        from_email,
      },
      create: {
        user_id: userId,
        host,
        port: Number(port) || 587,
        username,
        password,
        use_ssl: Boolean(use_ssl),
        from_name,
        from_email,
      },
    });

    await logAdminAction(req.user?.uid || 'admin', 'OVERRIDE_USER_SMTP', { userId, host, username });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user SMTP:', error);
    res.status(500).json({ error: 'Failed to update user SMTP' });
  }
});

/**
 * POST /api/admin/broadcast
 * Send a broadcast announcement email across platform users or contacts
 */
router.post('/broadcast', async (req: AuthRequest, res) => {
  const { recipientType, subject, bodyHtml, senderName } = req.body;
  if (!subject || !bodyHtml) {
    return res.status(400).json({ error: 'Subject and body are required' });
  }

  try {
    // 1. Fetch admin SMTP settings to send the broadcast
    const adminSmtp = await prisma.smtpSettings.findFirst({
      where: { host: { not: '' } },
    });

    if (!adminSmtp) {
      return res.status(400).json({ error: 'No active SMTP credentials configured on the system to send broadcasts.' });
    }

    // 2. Fetch recipients
    let recipientEmails: string[] = [];
    if (recipientType === 'contacts') {
      const contacts = await prisma.contact.findMany({
        where: { status: 'active' },
        select: { email: true },
        take: 500,
      });
      recipientEmails = Array.from(new Set(contacts.map((c) => c.email)));
    } else {
      const profiles = await prisma.profile.findMany({ select: { user_id: true } });
      recipientEmails = profiles.map((p) => p.user_id).filter((u) => u.includes('@'));
    }

    if (recipientEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found for this broadcast.' });
    }

    await logAdminAction(req.user?.uid || 'admin', 'SYSTEM_BROADCAST_SENT', {
      recipientCount: recipientEmails.length,
      subject,
      recipientType,
    });

    res.json({
      success: true,
      message: `Broadcast initiated for ${recipientEmails.length} recipients.`,
      recipientCount: recipientEmails.length,
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'Failed to dispatch broadcast' });
  }
});

/**
 * POST /api/admin/maintenance/bulk-retry-queue
 * Retries all failed queue items
 */
router.post('/maintenance/bulk-retry-queue', async (req: AuthRequest, res) => {
  try {
    const result = await prisma.emailQueue.updateMany({
      where: { status: 'failed' },
      data: { status: 'pending', error_message: null },
    });

    await logAdminAction(req.user?.uid || 'admin', 'BULK_RETRY_QUEUE', { count: result.count });
    res.json({ success: true, message: `Reset ${result.count} failed emails back to pending queue.` });
  } catch (error) {
    console.error('Error in bulk retry queue:', error);
    res.status(500).json({ error: 'Failed to retry queue' });
  }
});

/**
 * POST /api/admin/maintenance/purge-failed-queue
 * Purges all failed emails
 */
router.post('/maintenance/purge-failed-queue', async (req: AuthRequest, res) => {
  try {
    const result = await prisma.emailQueue.deleteMany({
      where: { status: 'failed' },
    });

    await logAdminAction(req.user?.uid || 'admin', 'PURGE_FAILED_QUEUE', { count: result.count });
    res.json({ success: true, message: `Purged ${result.count} failed emails from queue.` });
  } catch (error) {
    console.error('Error purging failed queue:', error);
    res.status(500).json({ error: 'Failed to purge failed queue' });
  }
});

/**
 * POST /api/admin/maintenance/purge-old-events
 * Purges tracking events older than specified days (default: 30 days)
 */
router.post('/maintenance/purge-old-events', async (req: AuthRequest, res) => {
  const days = Number(req.body.days) || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    const result = await prisma.emailEvent.deleteMany({
      where: { created_at: { lt: cutoffDate } },
    });

    await logAdminAction(req.user?.uid || 'admin', 'PURGE_OLD_EVENTS', { count: result.count, cutoffDate });
    res.json({ success: true, message: `Deleted ${result.count} tracking events older than ${days} days.` });
  } catch (error) {
    console.error('Error purging old events:', error);
    res.status(500).json({ error: 'Failed to purge old events' });
  }
});

export default router;
