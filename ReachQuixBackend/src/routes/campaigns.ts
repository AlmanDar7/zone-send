import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

// Require auth for all campaign routes
router.use(requireAuth);

// GET /api/campaigns
router.get('/', async (req: AuthRequest, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { user_id: req.user!.uid },
      include: {
        campaignSteps: {
          orderBy: { step_number: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(campaigns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/steps (get all steps for all campaigns for user)
router.get('/steps', async (req: AuthRequest, res) => {
  try {
    const steps = await prisma.campaignStep.findMany({
      where: { campaign: { user_id: req.user!.uid } },
      orderBy: { step_number: 'asc' },
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign steps' });
  }
});

// GET /api/campaigns/:id/report - full campaign report data
router.get('/:id/report', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign || campaign.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const steps = await prisma.campaignStep.findMany({
      where: { campaign_id: req.params.id },
      include: { template: { select: { name: true } } },
      orderBy: { step_number: 'asc' }
    });

    const queueStats = await prisma.emailQueue.findMany({
      where: { campaign_id: req.params.id },
      select: { step_number: true, status: true, variant: true, open_count: true, click_count: true }
    });

    const events = await prisma.emailEvent.findMany({
      where: { campaign_id: req.params.id },
      select: { event_type: true, email_queue_id: true }
    });

    const contacts = await prisma.contact.findMany({
      where: { campaign_id: req.params.id },
      select: { id: true, name: true, email: true, status: true },
      orderBy: { updated_at: 'desc' }
    });

    // Remap steps to include email_templates key for frontend compatibility
    const mappedSteps = steps.map(s => ({
      ...s,
      email_templates: s.template
    }));

    res.json({
      campaign,
      steps: mappedSteps,
      queueStats,
      events,
      contacts: contacts.map(c => ({ ...c, lead_score: 0 })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch campaign report' });
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        campaignSteps: {
          include: { template: true },
          orderBy: { step_number: 'asc' }
        }
      }
    });
    if (!campaign || campaign.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns
router.post('/', async (req: AuthRequest, res) => {
  const { name, daily_limit, status, steps } = req.body;
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        daily_limit: daily_limit || 0,
        status: status || 'draft',
        user_id: req.user!.uid,
        campaignSteps: {
          create: (steps || []).map((step: any, index: number) => ({
            step_number: index + 1,
            delay_days: step.delay_days || 0,
            delay_unit: step.delay_unit || 'days',
            delay_value: step.delay_value || 0,
            template_id: step.template_id || null,
          }))
        }
      },
      include: {
        campaignSteps: true
      }
    });
    res.json(campaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Delete steps first
    await prisma.campaignStep.deleteMany({ where: { campaign_id: req.params.id } });
    await prisma.campaign.delete({ where: { id: req.params.id } });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// PUT /api/campaigns/:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// POST /api/campaigns/:id/steps
router.post('/:id/steps', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign || campaign.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    const step = await prisma.campaignStep.create({
      data: {
        campaign_id: req.params.id,
        step_number: req.body.step_number,
        delay_days: req.body.delay_days || 0,
        delay_unit: req.body.delay_unit || 'days',
        delay_value: req.body.delay_value || 0,
        template_id: req.body.template_id || null,
        subject_a: req.body.subject_a || null,
        subject_b: req.body.subject_b || null,
        body_a: req.body.body_a || null,
        body_b: req.body.body_b || null,
        ab_test_enabled: req.body.ab_test_enabled || false,
      }
    });
    res.json(step);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create step' });
  }
});

// PUT /api/campaigns/:campaignId/steps/:stepId
router.put('/:campaignId/steps/:stepId', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.campaignId } });
    if (!campaign || campaign.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    const updated = await prisma.campaignStep.update({
      where: { id: req.params.stepId, campaign_id: req.params.campaignId },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// DELETE /api/campaigns/:campaignId/steps/:stepId
router.delete('/:campaignId/steps/:stepId', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.campaignId } });
    if (!campaign || campaign.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    await prisma.campaignStep.delete({
      where: { id: req.params.stepId, campaign_id: req.params.campaignId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

export default router;
