import { Router } from 'express';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { getPlatformVerificationSmtp, sendAccountVerificationEmail } from '../services/mailer';

const router = Router();

router.post('/send-verification', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!getPlatformVerificationSmtp()) {
      return res.status(503).json({
        error: 'Platform verification SMTP is not configured',
        fallbackToFirebase: true,
      });
    }

    if (getApps().length === 0) {
      return res.status(503).json({
        error: 'Firebase Admin is not configured',
        fallbackToFirebase: true,
      });
    }

    const uid = req.user!.uid;
    const userRecord = await getAuth().getUser(uid);
    if (userRecord.emailVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }

    const continueUrl =
      process.env.APP_URL?.trim() ||
      process.env.VERIFICATION_CONTINUE_URL?.trim() ||
      `${req.headers.origin || 'https://user.reachquix.com'}/verify-email`;

    const verificationLink = await getAuth().generateEmailVerificationLink(
      userRecord.email!,
      { url: continueUrl },
    );

    const result = await sendAccountVerificationEmail({
      to: userRecord.email!,
      verificationLink,
      displayName: userRecord.displayName,
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send verification email' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Verification email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send verification email' });
  }
});

export default router;
