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
