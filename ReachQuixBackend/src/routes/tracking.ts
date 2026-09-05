import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// Transparent 1x1 GIF base64
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * GET /api/track/open/:queueId
 * Records an email open event and serves a transparent 1x1 tracking pixel
 */
router.get('/open/:queueId', async (req: Request, res: Response) => {
  const queueId = String(req.params.queueId);

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', TRANSPARENT_GIF_BUFFER.length.toString());
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const queueItem = await prisma.emailQueue.findUnique({
      where: { id: queueId },
    });

    if (queueItem) {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      await Promise.all([
        prisma.emailQueue.update({
          where: { id: queueId },
          data: { open_count: { increment: 1 } },
        }),
        prisma.emailEvent.create({
          data: {
            user_id: queueItem.user_id,
            campaign_id: queueItem.campaign_id,
            contact_id: queueItem.contact_id,
            email_queue_id: queueItem.id,
            event_type: 'open',
            ip_address: typeof ip === 'string' ? ip.split(',')[0].trim() : null,
            user_agent: userAgent ? userAgent.slice(0, 500) : null,
          },
        }),
      ]);
    }
  } catch (error) {
    console.error('Error logging email open event:', error);
  }

  return res.end(TRANSPARENT_GIF_BUFFER);
});

/**
 * GET /api/track/click/:queueId?url=https://...
 * Records a link click event and redirects the recipient to the target URL
 */
router.get('/click/:queueId', async (req: Request, res: Response) => {
  const queueId = String(req.params.queueId);
  const targetUrl = req.query.url ? decodeURIComponent(String(req.query.url)) : null;

  if (!targetUrl) {
    return res.status(400).send('Missing destination URL');
  }

  try {
    const queueItem = await prisma.emailQueue.findUnique({
      where: { id: queueId },
    });

    if (queueItem) {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      await Promise.all([
        prisma.emailQueue.update({
          where: { id: queueId },
          data: { click_count: { increment: 1 } },
        }),
        prisma.emailEvent.create({
          data: {
            user_id: queueItem.user_id,
            campaign_id: queueItem.campaign_id,
            contact_id: queueItem.contact_id,
            email_queue_id: queueItem.id,
            event_type: 'click',
            link_url: targetUrl,
            ip_address: typeof ip === 'string' ? ip.split(',')[0].trim() : null,
            user_agent: userAgent ? userAgent.slice(0, 500) : null,
          },
        }),
      ]);
    }
  } catch (error) {
    console.error('Error logging email click event:', error);
  }

  return res.redirect(302, targetUrl);
});

/**
 * Helper to process the unsubscribe logic
 */
async function processUnsubscribe(queueId: string, ip: string | null, userAgent: string | null) {
  const queueItem = await prisma.emailQueue.findUnique({
    where: { id: queueId },
    include: { contact: true },
  });

  if (!queueItem || !queueItem.contact) {
    return null;
  }

  // 1. Update contact status to Unsubscribed
  await prisma.contact.update({
    where: { id: queueItem.contact_id },
    data: { status: 'Unsubscribed' },
  });

  // 2. Cancel all pending future sequence steps in the queue for this contact
  await prisma.emailQueue.updateMany({
    where: {
      contact_id: queueItem.contact_id,
      status: 'pending',
    },
    data: {
      status: 'failed',
      error_message: 'Recipient opted out / unsubscribed.',
    },
  });

  // 3. Log the unsubscribe event
  await prisma.emailEvent.create({
    data: {
      user_id: queueItem.user_id,
      campaign_id: queueItem.campaign_id,
      contact_id: queueItem.contact_id,
      email_queue_id: queueItem.id,
      event_type: 'unsubscribe',
      ip_address: ip,
      user_agent: userAgent ? userAgent.slice(0, 500) : null,
    },
  });

  return queueItem.contact;
}

/**
 * GET /api/track/unsubscribe/:queueId
 * Unsubscribes the recipient and renders a clean confirmation page
 */
router.get('/unsubscribe/:queueId', async (req: Request, res: Response) => {
  const queueId = String(req.params.queueId);
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  try {
    const contact = await processUnsubscribe(
      queueId,
      typeof ip === 'string' ? ip.split(',')[0].trim() : null,
      userAgent
    );

    const emailDisplay = contact ? contact.email : 'Your email';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Unsubscribed - ReachQuix</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 40px 32px;
            max-width: 460px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .icon-badge {
            width: 60px;
            height: 60px;
            background: #f0fdf4;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: #16a34a;
          }
          h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          p { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 16px; }
          .email-tag {
            display: inline-block;
            background: #f1f5f9;
            color: #334155;
            font-weight: 600;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            margin-bottom: 24px;
            word-break: break-all;
          }
          .resubscribe-btn {
            display: inline-block;
            color: #16a34a;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            transition: color 0.2s;
          }
          .resubscribe-btn:hover { text-decoration: underline; color: #15803d; }
          .footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
            font-size: 12px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1>Successfully Unsubscribed</h1>
          <p>You will no longer receive automated email outreach from this sender.</p>
          <div class="email-tag">${emailDisplay}</div>
          <div>
            <a href="/api/track/resubscribe/${queueId}" class="resubscribe-btn">
              Unsubscribed by accident? Click here to re-subscribe.
            </a>
          </div>
          <div class="footer">
            Powered by <strong>ReachQuix</strong>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return res.status(500).send('An error occurred while processing your request.');
  }
});

/**
 * POST /api/track/unsubscribe/:queueId
 * RFC 8058 One-Click List-Unsubscribe for email clients (Gmail, Apple Mail)
 */
router.post('/unsubscribe/:queueId', async (req: Request, res: Response) => {
  const queueId = String(req.params.queueId);
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  try {
    await processUnsubscribe(
      queueId,
      typeof ip === 'string' ? ip.split(',')[0].trim() : null,
      userAgent
    );
    return res.status(200).json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error processing one-click unsubscribe:', error);
    return res.status(500).json({ error: 'Failed to process unsubscribe' });
  }
});

/**
 * GET /api/track/resubscribe/:queueId
 * Re-subscribes the recipient
 */
router.get('/resubscribe/:queueId', async (req: Request, res: Response) => {
  const queueId = String(req.params.queueId);

  try {
    const queueItem = await prisma.emailQueue.findUnique({
      where: { id: queueId },
    });

    if (queueItem) {
      await prisma.contact.update({
        where: { id: queueItem.contact_id },
        data: { status: 'active' },
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Re-subscribed - ReachQuix</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 40px 32px;
            max-width: 460px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          p { font-size: 14px; color: #64748b; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Welcome Back!</h1>
          <p>Your email subscription has been restored successfully.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error re-subscribing:', error);
    return res.status(500).send('Failed to re-subscribe.');
  }
});

export default router;
