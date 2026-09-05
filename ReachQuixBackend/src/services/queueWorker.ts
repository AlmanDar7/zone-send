import prisma from '../db';
import { sendOutreachEmail, interpolateVariables } from './mailer';

let isProcessing = false;

/**
 * Resets daily quotas for all users if the date has changed
 */
async function resetDailySendingLimitsIfNeeded() {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    await prisma.sendingLimit.updateMany({
      where: {
        last_reset_date: {
          not: todayStr,
        },
      },
      data: {
        sent_today: 0,
        last_reset_date: todayStr,
      },
    });
  } catch (error) {
    console.error('Error resetting daily sending limits:', error);
  }
}

/**
 * Process all pending emails in the queue
 */
export async function processPendingQueue(): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  if (isProcessing) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  isProcessing = true;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  try {
    await resetDailySendingLimitsIfNeeded();

    const now = new Date();
    // Fetch pending emails that are scheduled now or in the past
    const pendingItems = await prisma.emailQueue.findMany({
      where: {
        status: 'pending',
        scheduled_at: {
          lte: now,
        },
      },
      include: {
        contact: true,
        campaign: {
          include: {
            campaignSteps: {
              include: {
                template: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduled_at: 'asc',
      },
      take: 50, // Batch size per tick
    });

    if (pendingItems.length === 0) {
      isProcessing = false;
      return { processed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    for (const queueItem of pendingItems) {
      const userId = queueItem.user_id;

      // 0. Check if recipient is already unsubscribed or bounced
      if (queueItem.contact?.status === 'Unsubscribed' || queueItem.contact?.status === 'Bounced') {
        await prisma.emailQueue.update({
          where: { id: queueItem.id },
          data: {
            status: 'failed',
            error_message: `Contact is ${queueItem.contact.status}. Email suppressed.`,
          },
        });
        failedCount++;
        continue;
      }

      // 1. Fetch user SMTP settings
      const smtp = await prisma.smtpSettings.findUnique({
        where: { user_id: userId },
      });

      if (!smtp || !smtp.host || !smtp.username || !smtp.password) {
        await prisma.emailQueue.update({
          where: { id: queueItem.id },
          data: {
            status: 'failed',
            error_message: 'User does not have configured SMTP credentials.',
          },
        });
        failedCount++;
        continue;
      }

      // 2. Check user sending limits
      let sendingLimit = await prisma.sendingLimit.findUnique({
        where: { user_id: userId },
      });

      if (!sendingLimit) {
        sendingLimit = await prisma.sendingLimit.create({
          data: {
            user_id: userId,
            max_per_day: 500,
            sent_today: 0,
            last_reset_date: new Date().toISOString().slice(0, 10),
          },
        });
      }

      if (sendingLimit.sent_today >= sendingLimit.max_per_day) {
        // Daily quota reached, skip for today
        skippedCount++;
        continue;
      }

      // 3. Find campaign step for this queue item
      const step = queueItem.campaign.campaignSteps.find(
        (s) => s.step_number === queueItem.step_number
      ) || queueItem.campaign.campaignSteps[0];

      if (!step) {
        await prisma.emailQueue.update({
          where: { id: queueItem.id },
          data: {
            status: 'failed',
            error_message: `Campaign step #${queueItem.step_number} not found.`,
          },
        });
        failedCount++;
        continue;
      }

      // 4. Resolve Tracking & Unsubscribe URLs
      const appUrl = process.env.APP_URL || process.env.API_BASE_URL || 'http://localhost:5000';
      const trackingPixelUrl = `${appUrl}/api/track/open/${queueItem.id}`;
      const clickTrackingUrlPrefix = `${appUrl}/api/track/click/${queueItem.id}`;
      const unsubscribeUrl = `${appUrl}/api/track/unsubscribe/${queueItem.id}`;

      // 5. Resolve Subject, Body, and Template
      const isVariantB = queueItem.variant === 'B' && step.ab_test_enabled;
      let rawSubject = (isVariantB ? step.subject_b : step.subject_a) || step.template?.subject || 'Important update';
      let rawPreview = (isVariantB ? step.preview_text_b : step.preview_text_a) || step.template?.preview_text || '';
      let rawBody = (isVariantB ? step.body_b : step.body_a) || step.template?.body || '';
      let rawHtml = step.template?.html_body || '';

      const contactVars = {
        ...queueItem.contact,
        sender_name: smtp.from_name || 'ReachQuix Outreach',
        unsubscribe_url: unsubscribeUrl,
      };

      const finalSubject = interpolateVariables(rawSubject, contactVars);
      const finalPreview = interpolateVariables(rawPreview, contactVars);
      const finalBody = interpolateVariables(rawBody, contactVars);
      const finalHtml = rawHtml ? interpolateVariables(rawHtml, contactVars) : undefined;

      // 6. Dispatch Email with List-Unsubscribe headers
      const result = await sendOutreachEmail({
        smtp,
        to: queueItem.contact.email,
        subject: finalSubject,
        previewText: finalPreview,
        bodyText: finalBody,
        htmlBody: finalHtml,
        trackingPixelUrl,
        clickTrackingUrlPrefix,
        unsubscribeUrl,
      });

      if (result.success) {
        // Mark as sent
        await prisma.emailQueue.update({
          where: { id: queueItem.id },
          data: {
            status: 'sent',
            sent_at: new Date(),
            error_message: null,
          },
        });

        // Increment user daily sending count
        await prisma.sendingLimit.update({
          where: { user_id: userId },
          data: { sent_today: { increment: 1 } },
        });

        sentCount++;
      } else {
        // Mark as failed
        await prisma.emailQueue.update({
          where: { id: queueItem.id },
          data: {
            status: 'failed',
            error_message: result.error || 'Failed to dispatch email.',
          },
        });
        failedCount++;
      }
    }
  } catch (error) {
    console.error('Error during queue processing worker run:', error);
  } finally {
    isProcessing = false;
  }

  return {
    processed: sentCount + failedCount + skippedCount,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
  };
}

let workerTimer: NodeJS.Timeout | null = null;

/**
 * Starts the automatic background queue processor
 */
export function startQueueWorker(intervalMs: number = 10000) {
  if (workerTimer) return;

  console.log(`📬 [QueueWorker] Background email dispatcher initialized (polling every ${intervalMs / 1000}s)`);

  // Initial immediate run
  processPendingQueue().catch((err) => console.error('[QueueWorker] Initial run error:', err));

  // Recurring cron-style timer
  workerTimer = setInterval(() => {
    processPendingQueue().catch((err) => console.error('[QueueWorker] Polling run error:', err));
  }, intervalMs);
}

export function stopQueueWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log('📬 [QueueWorker] Background email dispatcher stopped');
  }
}
