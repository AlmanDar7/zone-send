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
        last_reset_date: new Date().toISOString().slice(0, 10),
      }
    });
    res.json(limit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save sending limits' });
  }
});

import { sendTestEmail, verifySmtp, SmtpConfig } from '../services/mailer';

// --- Send Test Email & Verify SMTP ---
router.post('/test-email', async (req: AuthRequest, res) => {
  try {
    const { to, host, port, username, password, use_ssl, from_name, from_email } = req.body;
    const recipientEmail = to || req.user?.email;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email address ("to") is required.' });
    }

    // Use passed config if provided, otherwise fetch user's saved SMTP settings
    let smtpConfig: SmtpConfig | null = null;

    if (host && username && password) {
      smtpConfig = {
        host,
        port: Number(port) || 587,
        username,
        password,
        use_ssl: use_ssl !== undefined ? Boolean(use_ssl) : false,
        from_name: from_name || null,
        from_email: from_email || null,
      };
    } else {
      const saved = await prisma.smtpSettings.findUnique({
        where: { user_id: req.user!.uid },
      });
      if (saved) {
        smtpConfig = saved;
      }
    }

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      return res.status(400).json({ error: 'No SMTP configuration found. Please fill in and save your SMTP settings first.' });
    }

    const result = await sendTestEmail(smtpConfig, recipientEmail);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send test email' });
    }

    res.json({
      success: true,
      message: `Test email sent successfully to ${recipientEmail}`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

export default router;
