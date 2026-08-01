import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export type SmtpSettings = {
  host: string;
  port: number;
  username: string;
  password: string;
  from_name?: string | null;
  from_email?: string | null;
  use_ssl?: boolean | null;
};

export type OutgoingMail = {
  to: string;
  subject: string;
  content: string;
  html: string;
};

/** Port 465 = implicit TLS; 587/25 use STARTTLS (tls: false in denomailer). */
export function resolveSmtpTls(port: number, useSsl?: boolean | null): boolean {
  if (port === 465) return true;
  if (port === 587 || port === 25 || port === 2525) return false;
  return Boolean(useSsl);
}

export function formatFromAddress(smtp: SmtpSettings): string {
  const email = (smtp.from_email?.trim() || smtp.username.trim());
  const name = smtp.from_name?.trim();
  return name ? `${name} <${email}>` : email;
}

export async function sendSmtpMail(smtp: SmtpSettings, mail: OutgoingMail): Promise<void> {
  const port = Number(smtp.port);
  if (!smtp.host?.trim()) throw new Error("SMTP host is missing.");
  if (!Number.isFinite(port) || port < 1) throw new Error("SMTP port is invalid.");
  if (!smtp.username?.trim() || !smtp.password?.trim()) {
    throw new Error("SMTP username and password are required.");
  }

  const client = new SMTPClient({
    connection: {
      hostname: smtp.host.trim(),
      port,
      tls: resolveSmtpTls(port, smtp.use_ssl),
      auth: {
        username: smtp.username.trim(),
        password: smtp.password,
      },
    },
  });

  try {
    await client.send({
      from: formatFromAddress(smtp),
      to: mail.to,
      subject: mail.subject,
      content: mail.content,
      html: mail.html,
    });
  } finally {
    await client.close();
  }
}

export function friendlySmtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("connection refused") || lower.includes("connection reset") || lower.includes("timed out")) {
    return "Could not connect to your SMTP server. Check the host, port, and SSL setting (465 = SSL on, 587 = SSL off).";
  }
  if (
    lower.includes("authentication") ||
    lower.includes("invalid login") ||
    lower.includes("535") ||
    lower.includes("534")
  ) {
    return "SMTP login failed. Verify username and password (use an app password if your email host requires it).";
  }
  if (lower.includes("certificate") || lower.includes("tls") || lower.includes("ssl")) {
    return "TLS/SSL handshake failed. Use port 465 with SSL on, or port 587 with SSL off.";
  }
  if (lower.includes("550") || lower.includes("sender") || lower.includes("from address")) {
    return "Your mail server rejected the sender address. Set “From email” to the same address as your SMTP username.";
  }
  return message;
}
