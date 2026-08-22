import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

// Require auth for all template routes
router.use(requireAuth);

// GET /api/templates
router.get('/', async (req: AuthRequest, res) => {
  const category = req.query.category as string;
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: {
        user_id: req.user!.uid,
        ...(category ? { category } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/:id
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id },
    });
    
    if (!template || template.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/templates
router.post('/', async (req: AuthRequest, res) => {
  try {
    const template = await prisma.emailTemplate.create({
      data: {
        ...req.body,
        user_id: req.user!.uid,
      },
    });
    res.json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    // Ensure ownership
    const existing = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.emailTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// --- BRAND THEMES ---

// GET /api/templates/brand-themes
router.get('/brand-themes/all', async (req: AuthRequest, res) => {
  try {
    const themes = await prisma.brandTheme.findMany({
      where: { user_id: req.user!.uid },
      orderBy: { created_at: 'desc' },
    });
    res.json(themes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch brand themes' });
  }
});

// POST /api/templates/brand-themes
router.post('/brand-themes', async (req: AuthRequest, res) => {
  try {
    const theme = await prisma.brandTheme.create({
      data: {
        ...req.body,
        user_id: req.user!.uid,
      },
    });
    res.json(theme);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create brand theme' });
  }
});

// PUT /api/templates/brand-themes/:id
router.put('/brand-themes/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.brandTheme.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Brand theme not found' });
    }

    const theme = await prisma.brandTheme.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(theme);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update brand theme' });
  }
});

// DELETE /api/templates/brand-themes/:id
router.delete('/brand-themes/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.brandTheme.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Brand theme not found' });
    }

    await prisma.brandTheme.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete brand theme' });
  }
});

// --- TEMPLATE SECTIONS ---

// GET /api/templates/sections/all
router.get('/sections/all', async (req: AuthRequest, res) => {
  try {
    const sections = await prisma.templateSection.findMany({
      where: { user_id: req.user!.uid },
      orderBy: { created_at: 'desc' },
    });
    res.json(sections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch template sections' });
  }
});

// POST /api/templates/sections
router.post('/sections', async (req: AuthRequest, res) => {
  try {
    const section = await prisma.templateSection.create({
      data: {
        ...req.body,
        user_id: req.user!.uid,
      },
    });
    res.json(section);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create template section' });
  }
});

// DELETE /api/templates/sections/:id
router.delete('/sections/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.templateSection.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.user_id !== req.user!.uid) {
      return res.status(404).json({ error: 'Template section not found' });
    }

    await prisma.templateSection.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete template section' });
  }
});

export default router;

