import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

// --- SMTP ---
router.get('/smtp', async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.smtpSettings.findUnique({
      where: { user_id: req.user!.uid }
    });
    res.json(settings || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch SMTP settings' });
  }
});

router.post('/smtp', async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.smtpSettings.upsert({
      where: { user_id: req.user!.uid },
      update: req.body,
      create: { ...req.body, user_id: req.user!.uid }
    });
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

// --- Google Sheets ---
router.get('/google-sheets', async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.googleSheetSettings.findUnique({
      where: { user_id: req.user!.uid }
    });
    res.json(settings || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch Google Sheet settings' });
  }
});

router.post('/google-sheets', async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.googleSheetSettings.upsert({
      where: { user_id: req.user!.uid },
      update: req.body,
      create: { ...req.body, user_id: req.user!.uid }
    });
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save Google Sheet settings' });
  }
});

// --- Sending Limits ---
router.get('/sending-limits', async (req: AuthRequest, res) => {
  try {
    const limit = await prisma.sendingLimit.findUnique({
      where: { user_id: req.user!.uid }
    });
    res.json(limit || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sending limits' });
  }
});

router.post('/sending-limits', async (req: AuthRequest, res) => {
  try {
    const limit = await prisma.sendingLimit.upsert({
      where: { user_id: req.user!.uid },
      update: { max_per_day: req.body.max_per_day },
      create: {
        user_id: req.user!.uid,
        max_per_day: req.body.max_per_day || 500,
        last_reset_date: new Date().toISOString().split('T')[0],
      }
    });
    res.json(limit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save sending limits' });
  }
});

// --- Send Test Email (placeholder—will use nodemailer later) ---
router.post('/test-email', async (req: AuthRequest, res) => {
  try {
    // For now just acknowledge; actual SMTP sending needs nodemailer
    res.json({ success: true, message: 'Test email endpoint placeholder' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
