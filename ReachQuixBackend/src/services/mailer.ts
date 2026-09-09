import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  use_ssl: boolean;
  from_name?: string | null;
  from_email?: string | null;
}

export interface ContactVariables {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  sender_name?: string | null;
  unsubscribe_url?: string | null;
  [key: string]: any;
}

/**
 * Creates a nodemailer Transporter using user-provided SMTP credentials
 */
export function createTransporter(config: SmtpConfig) {
  const isPort465 = Number(config.port) === 465;
  const isSecure = config.use_ssl !== undefined ? Boolean(config.use_ssl) : isPort465;

  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: isSecure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert blocks in dev/sandbox
    },
  });
}

/**
 * Verifies SMTP connection credentials
 */
export async function verifySmtp(config: SmtpConfig): Promise<{ valid: boolean; error?: string }> {
  try {
    const transporter = createTransporter(config);
    await transporter.verify();
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Failed to verify SMTP credentials' };
  }
}

/**
 * Replaces dynamic variables in subject or body text (e.g. {{name}}, {{FirstName}}, {{company}}, {{unsubscribe_url}})
 */
export function interpolateVariables(template: string, vars: ContactVariables): string {
  if (!template) return '';
  
  const firstName = vars.first_name || (vars.name ? vars.name.split(' ')[0] : '') || '';
  const lastName = vars.last_name || (vars.name && vars.name.includes(' ') ? vars.name.split(' ').slice(1).join(' ') : '') || '';
  const company = vars.company_name || '';
  const email = vars.email || '';
  const phone = vars.phone || '';
  const senderName = vars.sender_name || 'ReachQuix Outreach';
  const unsubscribeUrl = vars.unsubscribe_url || '#';

  const lookup: Record<string, string> = {
    '{{name}}': vars.name || firstName || 'there',
    '{{Name}}': vars.name || firstName || 'there',
    '{{FirstName}}': firstName || 'there',
    '{{firstname}}': firstName || 'there',
    '{{first_name}}': firstName || 'there',
    '{{LastName}}': lastName || '',
    '{{lastname}}': lastName || '',
    '{{last_name}}': lastName || '',
    '{{company}}': company,
    '{{Company}}': company,
    '{{company_name}}': company,
    '{{email}}': email,
    '{{Email}}': email,
    '{{phone}}': phone,
    '{{sender_name}}': senderName,
    '{{senderName}}': senderName,
    '{{unsubscribe_url}}': unsubscribeUrl,
    '{{unsubscribeUrl}}': unsubscribeUrl,
    '{{optout_url}}': unsubscribeUrl,
  };

  let result = template;
  for (const [key, value] of Object.entries(lookup)) {
    result = result.split(key).join(value);
  }

  // Also replace any custom {{key}} if found in vars
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined && value !== null) {
      result = result.split(`{{${key}}}`).join(String(value));
    }
  }

  return result;
}

export function getPlatformVerificationSmtp(): SmtpConfig | null {
  const host = process.env.VERIFICATION_SMTP_HOST?.trim();
  const username = process.env.VERIFICATION_SMTP_USER?.trim();
  const password = process.env.VERIFICATION_SMTP_PASS?.trim();
  const port = Number(process.env.VERIFICATION_SMTP_PORT || 587);

  if (!host || !username || !password || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    username,
    password,
    use_ssl: process.env.VERIFICATION_SMTP_USE_SSL === 'true' || port === 465,
    from_name: process.env.VERIFICATION_SMTP_FROM_NAME?.trim() || 'ReachQuix',
    from_email: process.env.VERIFICATION_SMTP_FROM_EMAIL?.trim() || username,
  };
}

/**
 * Sends an account verification email via platform SMTP (better deliverability than Firebase default).
 */
export async function sendAccountVerificationEmail(options: {
  to: string;
  verificationLink: string;
  displayName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const smtp = getPlatformVerificationSmtp();
  if (!smtp) {
    return { success: false, error: 'Platform verification SMTP is not configured' };
  }

  try {
    const transporter = createTransporter(smtp);
    const fromAddress = smtp.from_email || smtp.username;
    const fromName = smtp.from_name || 'ReachQuix';
    const greeting = options.displayName?.trim() || 'there';

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: options.to,
      subject: 'Verify your ReachQuix email address',
      text: `Hi ${greeting},\n\nPlease verify your email address to activate your ReachQuix account:\n\n${options.verificationLink}\n\nIf you did not create an account, you can ignore this email.\n\n— The ReachQuix Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <h1 style="color: #111827; font-size: 22px; margin: 0 0 16px;">Verify your email</h1>
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hi ${greeting},<br><br>
            Thanks for signing up for ReachQuix. Click the button below to verify your email address and activate your account.
          </p>
          <a href="${options.verificationLink}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: 600; font-size: 14px;">
            Verify email address
          </a>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">
            If the button does not work, copy and paste this link into your browser:<br>
            <a href="${options.verificationLink}" style="color: #2563eb; word-break: break-all;">${options.verificationLink}</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 32px 0 0;">If you did not create a ReachQuix account, you can safely ignore this email.</p>
        </div>
      `,
      headers: {
        'X-Entity-Ref-ID': 'reachquix-verification',
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send verification email' };
  }
}

/**
 * Sends a test email to verify end-to-end delivery
 */
export async function sendTestEmail(
  config: SmtpConfig,
  recipientEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createTransporter(config);
    const fromAddress = config.from_email || config.username;
    const fromName = config.from_name || 'ReachQuix Cold Email';
    const fromFormatted = `"${fromName}" <${fromAddress}>`;

    const info = await transporter.sendMail({
      from: fromFormatted,
      to: recipientEmail,
      subject: '✅ ReachQuix SMTP Test — Connection Successful!',
      text: `Hello,\n\nYour SMTP configuration on ReachQuix is working properly!\n\nHost: ${config.host}\nPort: ${config.port}\nUsername: ${config.username}\n\nTime sent: ${new Date().toISOString()}\n\nBest,\nThe ReachQuix Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #059669; margin-top: 0;">✅ SMTP Connection Successful!</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Your custom SMTP server configuration has been verified and is ready to deliver outreach campaigns on <strong>ReachQuix</strong>.
          </p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; font-size: 13px; color: #475569; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Host:</strong> ${config.host}</p>
            <p style="margin: 4px 0;"><strong>Port:</strong> ${config.port}</p>
            <p style="margin: 4px 0;"><strong>Sender Name:</strong> ${fromName}</p>
            <p style="margin: 4px 0;"><strong>Sender Email:</strong> ${fromAddress}</p>
            <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Sent automatically by ReachQuix.</p>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send test email' };
  }
}

/**
 * Rewrites <a href="..."> links in HTML to pass through the click tracking endpoint
 */
export function wrapLinksWithTracking(html: string, clickTrackingUrlPrefix: string): string {
  if (!html || !clickTrackingUrlPrefix) return html;

  // Regex to match href="http..." or href='http...'
  return html.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(https?:\/\/[^"'\s>]+)\1/gi, (match, quote, url) => {
    // Avoid double wrapping if already pointing to track/unsubscribe endpoint
    if (url.includes('/api/track/click/') || url.includes('/api/track/unsubscribe/')) return match;
    const trackedUrl = `${clickTrackingUrlPrefix}?url=${encodeURIComponent(url)}`;
    return match.replace(url, trackedUrl);
  });
}

/**
 * Sends a live outreach email with support for HTML, tracking pixel, link tracking, and List-Unsubscribe headers
 */
export async function sendOutreachEmail(options: {
  smtp: SmtpConfig;
  to: string;
  subject: string;
  bodyText?: string;
  htmlBody?: string;
  previewText?: string;
  trackingPixelUrl?: string;
  clickTrackingUrlPrefix?: string;
  unsubscribeUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      smtp,
      to,
      subject,
      bodyText,
      htmlBody,
      previewText,
      trackingPixelUrl,
      clickTrackingUrlPrefix,
      unsubscribeUrl,
    } = options;

    const transporter = createTransporter(smtp);
    const fromAddress = smtp.from_email || smtp.username;
    const fromName = smtp.from_name || 'ReachQuix Outreach';
    const fromFormatted = `"${fromName}" <${fromAddress}>`;

    let finalHtml = htmlBody || `<div style="font-family: sans-serif; white-space: pre-wrap;">${bodyText || ''}</div>`;

    // Rewrite URLs to pass through click tracking
    if (clickTrackingUrlPrefix) {
      finalHtml = wrapLinksWithTracking(finalHtml, clickTrackingUrlPrefix);
    }

    // Prepend hidden preview text if provided
    if (previewText) {
      const hiddenPreview = `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</div>`;
      finalHtml = hiddenPreview + finalHtml;
    }

    // Append tracking pixel if provided
    if (trackingPixelUrl) {
      const trackingImg = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none !important;" alt="" />`;
      finalHtml += trackingImg;
    }

    // Set standard List-Unsubscribe headers for email client compliance (Gmail/Yahoo)
    const headers: Record<string, string> = {};
    if (unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const info = await transporter.sendMail({
      from: fromFormatted,
      to,
      subject,
      text: bodyText || '',
      html: finalHtml,
      headers,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to dispatch email' };
  }
}
