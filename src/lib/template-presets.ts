export type TemplateFormat = "plain" | "visual";

export type VisualTemplatePresetId =
  | "lead-magnet"
  | "product-showcase"
  | "newsletter-digest";

export type VisualTemplateConfig = {
  presetId: VisualTemplatePresetId;
  brandName: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  heroImageUrl: string;
  secondaryTitle: string;
  secondaryBody: string;
  footerNote: string;
  accentColor: string;
  backgroundColor: string;
};

export type VisualTemplatePreset = {
  id: VisualTemplatePresetId;
  name: string;
  description: string;
  defaultSubject: string;
  defaultType: string;
  createConfig: () => VisualTemplateConfig;
};

export const sampleTemplateVariables = {
  FirstName: "Ava",
  Email: "ava@northstar.co",
  CompanyName: "Northstar",
};

export type TemplateVariableValues = typeof sampleTemplateVariables;

export const replaceTemplateVariables = (text: string, overrides?: Partial<TemplateVariableValues>) => {
  const values: TemplateVariableValues = {
    ...sampleTemplateVariables,
    ...overrides,
  };

  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: keyof TemplateVariableValues) => {
    return values[key] || `{{${key}}}`;
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderText = (value: string) => replaceTemplateVariables(escapeHtml(value)).replace(/\n/g, "<br>");

const createLeadMagnetConfig = (): VisualTemplateConfig => ({
  presetId: "lead-magnet",
  brandName: "Ava Studio",
  eyebrow: "Free Guide",
  headline: "Your [Enter Title of Lead Magnet] Is Here!",
  subheadline: "Share a polished lead magnet that feels premium, on-brand, and easy to scan.",
  body:
    "Welcome {{FirstName}},\n\nI am excited to share this free resource with you. This guide walks you through key steps, quick wins, and practical ideas you can use right away at {{CompanyName}}.",
  ctaText: "Download The Guide",
  ctaUrl: "https://example.com/guide",
  heroImageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  secondaryTitle: "What is inside",
  secondaryBody:
    "Use this section to highlight 2 or 3 key takeaways, action steps, or bonuses the reader will get after clicking.",
  footerNote: "You are receiving this because you requested resources from Ava Studio.",
  accentColor: "#c7d8cf",
  backgroundColor: "#f8f6f2",
});

const createProductShowcaseConfig = (): VisualTemplateConfig => ({
  presetId: "product-showcase",
  brandName: "Northstar Labs",
  eyebrow: "New Arrival",
  headline: "Launch your next favorite product with a polished reveal",
  subheadline: "Use a strong hero section, supporting copy, and a clear CTA to drive clicks.",
  body:
    "Hi {{FirstName}},\n\nWe built this layout for teams that want product emails to feel elevated instead of plain. Add your main announcement, social proof, or offer details here.",
  ctaText: "Shop Now",
  ctaUrl: "https://example.com/product",
  heroImageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  secondaryTitle: "Why readers click",
  secondaryBody:
    "Pair your strongest product image with short benefit-led copy, then finish with a high-contrast button.",
  footerNote: "Questions? Reply to this email and our team will help.",
  accentColor: "#d7c7bb",
  backgroundColor: "#f6f0ea",
});

const createNewsletterDigestConfig = (): VisualTemplateConfig => ({
  presetId: "newsletter-digest",
  brandName: "Weekly Brief",
  eyebrow: "Newsletter",
  headline: "A cleaner way to share updates, stories, and useful links",
  subheadline: "Ideal for weekly digests, founder updates, and curated content roundups.",
  body:
    "Hello {{FirstName}},\n\nHere is your latest update. Add a short editor's note, summary paragraph, or featured story introduction here before the CTA.",
  ctaText: "Read The Full Update",
  ctaUrl: "https://example.com/newsletter",
  heroImageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
  secondaryTitle: "This edition includes",
  secondaryBody:
    "Add featured articles, campaign highlights, product milestones, or upcoming events in this supporting section.",
  footerNote: "You are subscribed to Weekly Brief. Update your preferences anytime.",
  accentColor: "#bfd4d9",
  backgroundColor: "#f4f8f9",
});

export const visualTemplatePresets: VisualTemplatePreset[] = [
  {
    id: "lead-magnet",
    name: "Lead Magnet Download",
    description: "A minimal, editorial-style email for guides, freebies, and welcome downloads.",
    defaultSubject: "{{FirstName}}, your free guide is ready",
    defaultType: "Initial",
    createConfig: createLeadMagnetConfig,
  },
  {
    id: "product-showcase",
    name: "Product Showcase",
    description: "A more promotional visual layout for launches, collections, and featured offers.",
    defaultSubject: "{{FirstName}}, take a look at our latest release",
    defaultType: "Initial",
    createConfig: createProductShowcaseConfig,
  },
  {
    id: "newsletter-digest",
    name: "Newsletter Digest",
    description: "A polished update template for weekly roundups, stories, and curated content.",
    defaultSubject: "{{FirstName}}, here is this week's update",
    defaultType: "Follow-up 1",
    createConfig: createNewsletterDigestConfig,
  },
];

export const getPresetById = (presetId: VisualTemplatePresetId) =>
  visualTemplatePresets.find((preset) => preset.id === presetId) ?? visualTemplatePresets[0];

export const buildVisualTemplateContent = (config: VisualTemplateConfig) => {
  const plainBody = [
    config.headline,
    "",
    config.subheadline,
    "",
    config.body,
    "",
    `${config.secondaryTitle}`,
    config.secondaryBody,
    "",
    `${config.ctaText}: ${config.ctaUrl}`,
    "",
    config.footerNote,
  ].join("\n");

  const leadMagnetLayout = `
    <div style="max-width:620px;margin:0 auto;background:${config.backgroundColor};padding:28px 24px;font-family:Georgia, 'Times New Roman', serif;color:#1f2937;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;border:1px solid #d1d5db;border-radius:999px;padding:10px 18px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#374151;">
          ${renderText(config.brandName)}
        </div>
      </div>
      <div style="background:white;border-radius:28px;padding:24px;border:1px solid #e5e7eb;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;text-align:center;margin-bottom:14px;">
          ${renderText(config.eyebrow)}
        </div>
        <img src="${escapeHtml(config.heroImageUrl)}" alt="Template hero" style="width:100%;height:220px;object-fit:cover;border-radius:18px;margin-bottom:20px;" />
        <h1 style="font-size:38px;line-height:1.1;margin:0 0 14px;color:#111827;font-weight:500;text-align:center;">
          ${renderText(config.headline)}
        </h1>
        <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4b5563;margin:0 0 18px;text-align:center;">
          ${renderText(config.subheadline)}
        </p>
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:#374151;margin-bottom:20px;text-align:center;">
          ${renderText(config.body)}
        </div>
        <div style="text-align:center;margin-bottom:22px;">
          <a href="${escapeHtml(config.ctaUrl)}" style="display:inline-block;background:${config.accentColor};color:#1f2937;text-decoration:none;padding:14px 28px;border-radius:999px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
            ${renderText(config.ctaText)}
          </a>
        </div>
        <div style="background:#f9fafb;border-radius:18px;padding:18px 20px;">
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:10px;">
            ${renderText(config.secondaryTitle)}
          </div>
          <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#4b5563;">
            ${renderText(config.secondaryBody)}
          </div>
        </div>
      </div>
      <p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:#6b7280;text-align:center;margin:20px 12px 0;">
        ${renderText(config.footerNote)}
      </p>
    </div>
  `;

  const showcaseLayout = `
    <div style="max-width:640px;margin:0 auto;background:${config.backgroundColor};padding:18px;font-family:Arial,sans-serif;color:#1f2937;">
      <div style="background:white;border-radius:28px;padding:24px;border:1px solid #ebe7e3;box-shadow:0 16px 36px rgba(15,23,42,0.08);">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8b5e3c;margin-bottom:10px;">
          ${renderText(config.eyebrow)}
        </div>
        <h1 style="font-family:Georgia, 'Times New Roman', serif;font-size:34px;line-height:1.15;color:#111827;margin:0 0 18px;">
          ${renderText(config.headline)}
        </h1>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
          <tr>
            <td width="52%" valign="top" style="padding-right:10px;">
              <img src="${escapeHtml(config.heroImageUrl)}" alt="Template hero" style="width:100%;height:260px;object-fit:cover;border-radius:22px;display:block;" />
            </td>
            <td width="48%" valign="top" style="padding-left:10px;">
              <p style="font-size:15px;line-height:1.7;color:#6b7280;margin:0 0 14px;">
                ${renderText(config.subheadline)}
              </p>
              <div style="font-size:14px;line-height:1.8;color:#374151;margin-bottom:14px;">
                ${renderText(config.body)}
              </div>
              <div style="background:#f8fafc;border-radius:18px;padding:16px;">
                <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">
                  ${renderText(config.secondaryTitle)}
                </div>
                <div style="font-size:14px;line-height:1.7;color:#475569;">
                  ${renderText(config.secondaryBody)}
                </div>
              </div>
            </td>
          </tr>
        </table>
        <a href="${escapeHtml(config.ctaUrl)}" style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:13px;font-weight:600;">
          ${renderText(config.ctaText)}
        </a>
      </div>
      <p style="font-size:12px;line-height:1.7;color:#6b7280;text-align:center;margin:18px 8px 0;">
        ${renderText(config.footerNote)}
      </p>
    </div>
  `;

  const newsletterLayout = `
    <div style="max-width:640px;margin:0 auto;background:${config.backgroundColor};padding:22px;font-family:Arial,sans-serif;color:#1f2937;">
      <div style="background:white;border-radius:26px;padding:28px;border:1px solid #e2e8f0;box-shadow:0 16px 34px rgba(15,23,42,0.07);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px;">
          <div style="font-size:20px;font-weight:700;color:#0f172a;">${renderText(config.brandName)}</div>
          <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">${renderText(config.eyebrow)}</div>
        </div>
        <img src="${escapeHtml(config.heroImageUrl)}" alt="Template hero" style="width:100%;height:220px;object-fit:cover;border-radius:20px;display:block;margin-bottom:18px;" />
        <h1 style="font-size:32px;line-height:1.2;color:#0f172a;margin:0 0 12px;font-family:Georgia, 'Times New Roman', serif;">
          ${renderText(config.headline)}
        </h1>
        <p style="font-size:15px;line-height:1.8;color:#475569;margin:0 0 16px;">
          ${renderText(config.subheadline)}
        </p>
        <div style="font-size:14px;line-height:1.85;color:#334155;margin-bottom:18px;">
          ${renderText(config.body)}
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:18px;background:#f8fafc;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">
            ${renderText(config.secondaryTitle)}
          </div>
          <div style="font-size:14px;line-height:1.8;color:#475569;">
            ${renderText(config.secondaryBody)}
          </div>
        </div>
        <a href="${escapeHtml(config.ctaUrl)}" style="display:inline-block;background:${config.accentColor};color:#0f172a;text-decoration:none;padding:14px 24px;border-radius:14px;font-size:13px;font-weight:700;">
          ${renderText(config.ctaText)}
        </a>
      </div>
      <p style="font-size:12px;line-height:1.7;color:#64748b;text-align:center;margin:18px 8px 0;">
        ${renderText(config.footerNote)}
      </p>
    </div>
  `;

  const htmlBody =
    config.presetId === "product-showcase"
      ? showcaseLayout
      : config.presetId === "newsletter-digest"
        ? newsletterLayout
        : leadMagnetLayout;

  return {
    body: plainBody,
    htmlBody,
  };
};

export const getStarterTemplate = (presetId: VisualTemplatePresetId) => {
  const preset = getPresetById(presetId);
  const designConfig = preset.createConfig();
  const content = buildVisualTemplateContent(designConfig);

  return {
    name: preset.name,
    subject: preset.defaultSubject,
    body: content.body,
    type: preset.defaultType,
    template_format: "visual" as const,
    html_body: content.htmlBody,
    design_config: designConfig,
  };
};
