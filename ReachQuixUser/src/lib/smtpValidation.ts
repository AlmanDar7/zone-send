type SmtpLike = {
  host?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
};

export function hasUsableSmtpConfig(smtp: SmtpLike | null | undefined) {
  return Boolean(
    smtp?.host?.trim() &&
    smtp?.port &&
    smtp?.username?.trim() &&
    smtp?.password?.trim(),
  );
}

export function getSmtpConfigError() {
  return "SMTP is not configured. Go to Settings and save a valid SMTP host, port, username, and password before sending.";
}
