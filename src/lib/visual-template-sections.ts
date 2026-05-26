export type VisualTemplateConfigSlice = {
  presetId?: string;
  sectionOrder?: VisualSectionId[];
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

export type VisualSectionId =
  | "brand"
  | "eyebrow"
  | "hero"
  | "headline"
  | "subheadline"
  | "body"
  | "cta"
  | "secondary"
  | "footer"
  | "style";

export const DEFAULT_VISUAL_SECTION_ORDER: VisualSectionId[] = [
  "brand",
  "eyebrow",
  "hero",
  "headline",
  "subheadline",
  "body",
  "cta",
  "secondary",
  "footer",
];

export const visualSectionMeta: Record<
  VisualSectionId,
  { label: string; hint: string }
> = {
  brand: { label: "Brand badge", hint: "Top label, e.g. your company name" },
  eyebrow: { label: "Eyebrow", hint: "Small label above the headline" },
  hero: { label: "Hero image", hint: "Main image URL" },
  headline: { label: "Headline", hint: "Primary title" },
  subheadline: { label: "Subheadline", hint: "Supporting line under the title" },
  body: { label: "Main copy", hint: "Email body text" },
  cta: { label: "Button", hint: "Call-to-action label and link" },
  secondary: { label: "Extra section", hint: "Bonus box title and text" },
  footer: { label: "Footer", hint: "Legal or unsubscribe note" },
  style: { label: "Colors", hint: "Accent and background colors" },
};

/** Sections users can add from the campaign editor sidebar (excludes style) */
export const VISUAL_SECTION_PALETTE: VisualSectionId[] = [
  "brand",
  "eyebrow",
  "hero",
  "headline",
  "subheadline",
  "body",
  "cta",
  "secondary",
  "footer",
];

export const visualSectionBuilderLabel: Record<VisualSectionId, string> = {
  brand: "Brand",
  eyebrow: "Label",
  hero: "Image",
  headline: "Heading",
  subheadline: "Subheading",
  body: "Text",
  cta: "Button",
  secondary: "Info box",
  footer: "Footer",
  style: "Colors",
};

export const appendSectionToOrder = (
  order: VisualSectionId[] | null | undefined,
  sectionId: VisualSectionId,
): VisualSectionId[] => {
  const normalized = normalizeSectionOrder(order);
  if (sectionId === "style" || normalized.includes(sectionId)) return normalized;
  return [...normalized, sectionId];
};

export const removeSectionFromOrder = (
  order: VisualSectionId[] | null | undefined,
  sectionId: VisualSectionId,
): VisualSectionId[] => normalizeSectionOrder(order).filter((id) => id !== sectionId);

export const normalizeSectionOrder = (
  order?: VisualSectionId[] | null,
): VisualSectionId[] => {
  const base = order?.length ? [...order] : [...DEFAULT_VISUAL_SECTION_ORDER];
  const seen = new Set<VisualSectionId>();
  const normalized: VisualSectionId[] = [];

  for (const id of base) {
    if (!seen.has(id) && visualSectionMeta[id]) {
      seen.add(id);
      normalized.push(id);
    }
  }

  for (const id of DEFAULT_VISUAL_SECTION_ORDER) {
    if (!seen.has(id)) normalized.push(id);
  }

  return normalized.filter((id) => id !== "style");
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderText = (value: string) => escapeHtml(value).replace(/\n/g, "<br>");

export const buildLeadMagnetHtmlFromOrder = (config: VisualTemplateConfigSlice) => {
  const order = normalizeSectionOrder(config.sectionOrder);

  const fragments: Record<VisualSectionId, string> = {
    brand: `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;border:1px solid #d1d5db;border-radius:999px;padding:10px 18px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#374151;">
          ${renderText(config.brandName)}
        </div>
      </div>`,
    eyebrow: `
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;text-align:center;margin-bottom:14px;">
          ${renderText(config.eyebrow)}
        </div>`,
    hero: `
        <img src="${escapeHtml(config.heroImageUrl)}" alt="Template hero" style="width:100%;height:220px;object-fit:cover;border-radius:18px;margin-bottom:20px;" />`,
    headline: `
        <h1 style="font-size:38px;line-height:1.1;margin:0 0 14px;color:#111827;font-weight:500;text-align:center;">
          ${renderText(config.headline)}
        </h1>`,
    subheadline: `
        <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4b5563;margin:0 0 18px;text-align:center;">
          ${renderText(config.subheadline)}
        </p>`,
    body: `
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:#374151;margin-bottom:20px;text-align:center;">
          ${renderText(config.body)}
        </div>`,
    cta: `
        <div style="text-align:center;margin-bottom:22px;">
          <a href="${escapeHtml(config.ctaUrl)}" style="display:inline-block;background:${config.accentColor};color:#1f2937;text-decoration:none;padding:14px 28px;border-radius:999px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">
            ${renderText(config.ctaText)}
          </a>
        </div>`,
    secondary: `
        <div style="background:#f9fafb;border-radius:18px;padding:18px 20px;">
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin-bottom:10px;">
            ${renderText(config.secondaryTitle)}
          </div>
          <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#4b5563;">
            ${renderText(config.secondaryBody)}
          </div>
        </div>`,
    footer: `
      <p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:#6b7280;text-align:center;margin:20px 12px 0;">
        ${renderText(config.footerNote)}
      </p>`,
    style: "",
  };

  const innerIds = new Set<VisualSectionId>([
    "eyebrow",
    "hero",
    "headline",
    "subheadline",
    "body",
    "cta",
    "secondary",
  ]);

  const outerTop: string[] = [];
  const innerParts: string[] = [];
  const outerBottom: string[] = [];

  for (const id of order) {
    if (id === "style") continue;
    if (id === "brand") outerTop.push(fragments.brand);
    else if (id === "footer") outerBottom.push(fragments.footer);
    else if (innerIds.has(id)) innerParts.push(fragments[id]);
  }

  const cardHtml =
    innerParts.length > 0
      ? `<div style="background:white;border-radius:28px;padding:24px;border:1px solid #e5e7eb;box-shadow:0 18px 40px rgba(15,23,42,0.08);">${innerParts.join("")}</div>`
      : "";

  return `
    <div style="max-width:620px;margin:0 auto;background:${config.backgroundColor};padding:28px 24px;font-family:Georgia, 'Times New Roman', serif;color:#1f2937;">
      ${outerTop.join("")}
      ${cardHtml}
      ${outerBottom.join("")}
    </div>
  `;
};

