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
  const id = String(req.params.id);
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const steps = await prisma.campaignStep.findMany({
      where: { campaign_id: id },
      include: { template: { select: { name: true } } },
      orderBy: { step_number: 'asc' }
    });

    const queueStats = await prisma.emailQueue.findMany({
      where: { campaign_id: id },
      select: { step_number: true, status: true, variant: true, open_count: true, click_count: true }
    });

    const events = await prisma.emailEvent.findMany({
      where: { campaign_id: id },
      select: { event_type: true, email_queue_id: true }
    });

    const contacts = await prisma.contact.findMany({
      where: { campaign_id: id },
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
  const id = String(req.params.id);
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
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
  const { name, steps, daily_limit } = req.body;
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        daily_limit: daily_limit || 0,
        status: 'draft',
        user_id: req.user!.uid,
      },
    });

    // If steps were provided, create them
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await prisma.campaignStep.create({
          data: {
            campaign_id: campaign.id,
            step_number: step.step_number,
            delay_days: step.delay_days || 0,
            delay_unit: step.delay_unit || 'days',
            delay_value: step.delay_value || 0,
            template_id: step.template_id || null,
            subject_a: step.subject_a || null,
            subject_b: step.subject_b || null,
            preview_text_a: step.preview_text_a || step.preview_text || null,
            preview_text_b: step.preview_text_b || null,
            body_a: step.body_a || null,
            body_b: step.body_b || null,
            ab_test_enabled: step.ab_test_enabled || false,
          },
        });
      }
    }

    const completeCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { campaignSteps: true }
    });

    res.json(completeCampaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Delete steps first
    await prisma.campaignStep.deleteMany({ where: { campaign_id: id } });
    await prisma.campaign.delete({ where: { id } });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// PUT /api/campaigns/:id
router.put('/:id', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const updated = await prisma.campaign.update({
      where: { id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// POST /api/campaigns/:id/steps
router.post('/:id/steps', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    const step = await prisma.campaignStep.create({
      data: {
        campaign_id: id,
        step_number: req.body.step_number,
        delay_days: req.body.delay_days || 0,
        delay_unit: req.body.delay_unit || 'days',
        delay_value: req.body.delay_value || 0,
        template_id: req.body.template_id || null,
        subject_a: req.body.subject_a || null,
        subject_b: req.body.subject_b || null,
        preview_text_a: req.body.preview_text_a || req.body.preview_text || null,
        preview_text_b: req.body.preview_text_b || null,
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

// PUT /api/campaigns/:id/steps/sync - Replace all steps in campaign atomically
router.put('/:id/steps/sync', async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const { steps } = req.body;

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.user_id !== req.user!.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(steps)) {
      return res.status(400).json({ error: 'Steps must be an array' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.campaignStep.deleteMany({ where: { campaign_id: id } });

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await tx.campaignStep.create({
          data: {
            campaign_id: id,
            step_number: step.step_number || i + 1,
            delay_days: step.delay_days || 0,
            delay_unit: step.delay_unit || 'days',
            delay_value: step.delay_value || 0,
            template_id: step.template_id || null,
            subject_a: step.subject_a || null,
            subject_b: step.subject_b || null,
            preview_text_a: step.preview_text_a || step.preview_text || null,
            preview_text_b: step.preview_text_b || null,
            body_a: step.body_a || null,
            body_b: step.body_b || null,
            ab_test_enabled: step.ab_test_enabled || false,
          },
        });
      }
    });

    const updatedSteps = await prisma.campaignStep.findMany({
      where: { campaign_id: id },
      include: { template: true },
      orderBy: { step_number: 'asc' },
    });

    res.json(updatedSteps);
  } catch (error) {
    console.error('Error syncing campaign steps:', error);
    res.status(500).json({ error: 'Failed to sync campaign steps' });
  }
});

// PUT /api/campaigns/:campaignId/steps/:stepId
router.put('/:campaignId/steps/:stepId', async (req: AuthRequest, res) => {
  const campaignId = String(req.params.campaignId);
  const stepId = String(req.params.stepId);
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    const updated = await prisma.campaignStep.update({
      where: { id: stepId, campaign_id: campaignId },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// DELETE /api/campaigns/:campaignId/steps/:stepId
router.delete('/:campaignId/steps/:stepId', async (req: AuthRequest, res) => {
  const campaignId = String(req.params.campaignId);
  const stepId = String(req.params.stepId);
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.user_id !== req.user!.uid) return res.status(403).json({ error: 'Unauthorized' });
    
    await prisma.campaignStep.delete({
      where: { id: stepId, campaign_id: campaignId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

export default router;
