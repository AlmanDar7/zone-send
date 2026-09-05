import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import prisma from '../db';

const router = Router();

router.use(requireAuth);

/**
 * Helper to call Google Gemini API
 */
async function callGemini(apiKey: string, promptText: string): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn('Gemini API returned error:', err);
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate || null;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

/**
 * Helper to call OpenAI API
 */
async function callOpenAI(apiKey: string, promptText: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: promptText }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn('OpenAI API returned error:', err);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

/**
 * High-quality fallback copy generator when no live API key is configured
 */
function generateFallbackCopy(prompt: string, type: string, tone: string) {
  const toneDesc = tone || 'professional';
  const cleanPrompt = prompt ? prompt.trim() : 'our latest solution';

  if (type === 'subject') {
    return JSON.stringify([
      `Quick question regarding ${cleanPrompt} 💡`,
      `Exclusive invite for you: ${cleanPrompt}`,
      `How we helped teams improve with ${cleanPrompt}`,
      `A smarter approach to ${cleanPrompt}`,
    ]);
  }

  if (type === 'body') {
    if (toneDesc === 'casual') {
      return `Hey {{FirstName}},\n\nSaw what you're building and wanted to reach out quickly. We've been working on ${cleanPrompt} to help teams like yours save hours each week.\n\nWould love to show you how it works if you have 5 minutes this week.\n\nCheers,\n{{sender_name}}`;
    } else if (toneDesc === 'urgent') {
      return `Hi {{FirstName}},\n\nSpots are closing this week for our early access program around ${cleanPrompt}.\n\nIf improving your metrics is top of mind for {{company}}, let's lock in a quick 10-minute demo before Friday.\n\nBest regards,\n{{sender_name}}`;
    }
    return `Hi {{FirstName}},\n\nI hope you're having a productive week. I'm reaching out because we're currently partnering with leading companies in your space to optimize ${cleanPrompt}.\n\nBased on your work at {{company}}, I believe this could offer significant value for your current initiatives.\n\nDo you have 10 minutes next Tuesday or Wednesday for a quick discussion?\n\nBest regards,\n{{sender_name}}`;
  }

  // Full email (subject + body JSON)
  return JSON.stringify({
    subject: `Accelerating results with ${cleanPrompt} 🚀`,
    body: `Hi {{FirstName}},\n\nHope all is well with you at {{company}}.\n\nI'm reaching out because we recently released a new capability focused on ${cleanPrompt}.\n\nOur clients typically see higher engagement and faster turnaround times within the first few weeks of implementation.\n\nWould you be open to a brief 10-minute introduction this week to explore if this is a fit for {{company}}?\n\nWarm regards,\n{{sender_name}}`,
  });
}

/**
 * Parses simple CSV string into an array of objects
 */
function parseCsv(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header line
  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = lines[i].split(',');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const val = rawValues[j] ? rawValues[j].replace(/^["']|["']$/g, '').trim() : '';
      row[header] = val;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * POST /api/ai/write-email
 */
router.post('/write-email', async (req: AuthRequest, res) => {
  const { prompt, type, tone } = req.body;

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    let systemInstruction = `You are a cold email outreach copywriter. Tone: ${tone || 'professional'}.`;
    if (type === 'subject') {
      systemInstruction += ` Return a JSON array of 4 compelling email subject lines. No markdown code blocks, just raw JSON array like ["Subject 1", "Subject 2"].`;
    } else if (type === 'body') {
      systemInstruction += ` Write the email body. Use variables like {{FirstName}}, {{company}}, {{sender_name}}. Keep it under 150 words, concise, high conversion.`;
    } else {
      systemInstruction += ` Return a raw JSON object with keys "subject" and "body". Use variables like {{FirstName}}, {{company}}, {{sender_name}}. No markdown wrapping.`;
    }

    const fullPrompt = `${systemInstruction}\n\nOffer / Context: ${prompt}`;

    let aiResult: string | null = null;

    if (geminiKey) {
      aiResult = await callGemini(geminiKey, fullPrompt);
    } else if (openAiKey) {
      aiResult = await callOpenAI(openAiKey, fullPrompt);
    }

    // Use AI result if successful, otherwise generate heuristic fallback
    const content = aiResult ? aiResult.trim() : generateFallbackCopy(prompt, type, tone);

    res.json({ success: true, content });
  } catch (error: any) {
    console.error('Error generating AI email content:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI email' });
  }
});

/**
 * POST /api/ai/sync-google-sheets
 */
router.post('/sync-google-sheets', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const settings = await prisma.googleSheetSettings.findUnique({
      where: { user_id: userId },
    });

    if (!settings || !settings.sheet_url) {
      return res.status(400).json({
        error: 'No Google Sheet configured. Please save your Google Sheet URL in Settings first.',
      });
    }

    // Extract Google Sheet ID
    const match = settings.sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;

    if (!sheetId) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL format.' });
    }

    // Download CSV export of Google Sheet
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const response = await fetch(exportUrl);

    if (!response.ok) {
      return res.status(400).json({
        error: `Could not access Google Sheet. Make sure the sheet link is shared as "Anyone with the link can view".`,
      });
    }

    const csvText = await response.text();
    const rows = parseCsv(csvText);

    if (rows.length === 0) {
      return res.json({ success: true, message: 'Google Sheet is empty or had no valid rows.', importedCount: 0 });
    }

    let importedCount = 0;

    for (const row of rows) {
      // Find email key in row
      const email = row['email'] || row['email address'] || row['e-mail'] || row['contact email'];
      if (!email || !email.includes('@')) continue;

      const name = row['name'] || row['full name'] || row['contact name'] || '';
      const firstName = row['first name'] || row['firstname'] || (name ? name.split(' ')[0] : null);
      const lastName = row['last name'] || row['lastname'] || (name && name.includes(' ') ? name.split(' ').slice(1).join(' ') : null);
      const company = row['company'] || row['company name'] || row['organization'] || null;
      const phone = row['phone'] || row['phone number'] || row['mobile'] || null;

      const cleanEmail = email.toLowerCase().trim();

      const existing = await prisma.contact.findFirst({
        where: { email: cleanEmail, user_id: userId },
      });

      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            first_name: firstName || existing.first_name,
            last_name: lastName || existing.last_name,
            company_name: company || existing.company_name,
            phone: phone || existing.phone,
          },
        });
      } else {
        await prisma.contact.create({
          data: {
            user_id: userId,
            email: cleanEmail,
            name: name || null,
            first_name: firstName || null,
            last_name: lastName || null,
            company_name: company,
            phone,
            status: 'active',
          },
        });
      }
      importedCount++;
    }

    res.json({
      success: true,
      message: `Successfully synchronized ${importedCount} contact(s) from Google Sheet!`,
      importedCount,
    });
  } catch (error: any) {
    console.error('Error syncing Google Sheets:', error);
    res.status(500).json({ error: error.message || 'Failed to sync Google Sheets' });
  }
});

export default router;
