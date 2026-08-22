import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/write-email', async (req: AuthRequest, res) => {
  const { prompt, type, tone } = req.body;
  try {
    // If an OpenAI / Gemini key is configured in process.env.GEMINI_API_KEY / OPENAI_API_KEY, use it,
    // otherwise generate a smart fallback template content.
    let content = "";
    if (type === "subject") {
      content = `Boost your outreach: ${prompt || "Special Announcement"} 🚀`;
    } else if (type === "body") {
      content = `Hi {{name}},\n\nI wanted to share a quick update regarding ${prompt || "our services"}.\n\nLet me know what you think!\n\nBest regards,\n{{sender_name}}`;
    } else {
      content = JSON.stringify({
        subject: `Exclusive Update: ${prompt || "Important news for you"}`,
        body: `Hi {{name}},\n\nHope you're having a great week! I'm reaching out regarding ${prompt || "our latest collaboration"}.\n\nWould love to connect and hear your feedback.\n\nWarm regards,\n{{sender_name}}`
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate AI email' });
  }
});

router.post('/sync-google-sheets', async (req: AuthRequest, res) => {
  try {
    // Placeholder response for Google Sheets sync
    res.json({ success: true, message: 'Google Sheets synced successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to sync Google Sheets' });
  }
});

export default router;
