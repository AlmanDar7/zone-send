import { replaceTemplateVariables, type TemplateVariableValues } from "./template-presets";

export type BlockId = string;

export type Alignment = "left" | "center" | "right";

export type HeadingBlock = {
  id: BlockId;
  type: "heading";
  text: string;
  level: 1 | 2 | 3;
  alignment: Alignment;
  color: string;
  paddingY: number;
};

export type TextBlock = {
  id: BlockId;
  type: "text";
  text: string;
  alignment: Alignment;
  color: string;
  fontSize: number;
  paddingY: number;
};

export type ImageBlock = {
  id: BlockId;
  type: "image";
  src: string;
  alt: string;
  href: string;
  alignment: Alignment;
  width: number; // percent 10-100
  paddingY: number;
};

export type ButtonBlock = {
  id: BlockId;
  type: "button";
  text: string;
  href: string;
  background: string;
  textColor: string;
  radius: number;
  alignment: Alignment;
  paddingY: number;
};

export type DividerBlock = {
  id: BlockId;
  type: "divider";
  color: string;
  thickness: number;
  paddingY: number;
};

export type SpacerBlock = {
  id: BlockId;
  type: "spacer";
  height: number;
};

export type ColumnsBlock = {
  id: BlockId;
  type: "columns";
  left: Block[];
  right: Block[];
  gap: number;
  paddingY: number;
};

export type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock;

export type BlockType = Block["type"];

export type TemplateDocument = {
  version: 1;
  background: string;
  contentBackground: string;
  width: number;
  fontFamily: string;
  blocks: Block[];
};

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2));

export const createBlock = (type: BlockType): Block => {
  switch (type) {
    case "heading":
      return {
        id: uid(),
        type: "heading",
        text: "Your headline",
        level: 1,
        alignment: "left",
        color: "#111827",
        paddingY: 12,
      };
    case "text":
      return {
        id: uid(),
        type: "text",
        text: "Hi {{FirstName}},\n\nWrite your message here.",
        alignment: "left",
        color: "#374151",
        fontSize: 15,
        paddingY: 8,
      };
    case "image":
      return {
        id: uid(),
        type: "image",
        src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
        alt: "",
        href: "",
        alignment: "center",
        width: 100,
        paddingY: 12,
      };
    case "button":
      return {
        id: uid(),
        type: "button",
        text: "Click here",
        href: "https://example.com",
        background: "#111827",
        textColor: "#ffffff",
        radius: 999,
        alignment: "center",
        paddingY: 16,
      };
    case "divider":
      return {
        id: uid(),
        type: "divider",
        color: "#e5e7eb",
        thickness: 1,
        paddingY: 16,
      };
    case "spacer":
      return { id: uid(), type: "spacer", height: 24 };
    case "columns":
      return {
        id: uid(),
        type: "columns",
        left: [createBlock("text")],
        right: [createBlock("text")],
        gap: 16,
        paddingY: 12,
      };
  }
};

export const createEmptyDocument = (): TemplateDocument => ({
  version: 1,
  background: "#f3f4f6",
  contentBackground: "#ffffff",
  width: 620,
  fontFamily: "Arial, sans-serif",
  blocks: [
    {
      ...(createBlock("heading") as HeadingBlock),
      text: "Welcome, {{FirstName}}",
      alignment: "center",
    },
    createBlock("text"),
    createBlock("button"),
  ],
});

export const cloneBlock = (block: Block): Block => {
  if (block.type === "columns") {
    return {
      ...block,
      id: uid(),
      left: block.left.map(cloneBlock),
      right: block.right.map(cloneBlock),
    };
  }
  return { ...block, id: uid() };
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderInline = (text: string, vars?: Partial<TemplateVariableValues>) =>
  replaceTemplateVariables(escapeHtml(text), vars).replace(/\n/g, "<br>");

const headingFontSize = (level: 1 | 2 | 3) => (level === 1 ? 32 : level === 2 ? 24 : 18);

export const renderBlockHtml = (block: Block, vars?: Partial<TemplateVariableValues>): string => {
  switch (block.type) {
    case "heading": {
      const fs = headingFontSize(block.level);
      return `<div style="padding:${block.paddingY}px 0;text-align:${block.alignment};">
        <h${block.level} style="margin:0;font-size:${fs}px;line-height:1.25;color:${block.color};font-weight:700;">${renderInline(
        block.text,
        vars,
      )}</h${block.level}>
      </div>`;
    }
    case "text":
      return `<div style="padding:${block.paddingY}px 0;text-align:${block.alignment};font-size:${block.fontSize}px;line-height:1.7;color:${block.color};">${renderInline(
        block.text,
        vars,
      )}</div>`;
    case "image": {
      const img = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" style="width:${block.width}%;height:auto;display:inline-block;border-radius:8px;" />`;
      const wrapped = block.href
        ? `<a href="${escapeHtml(block.href)}" style="text-decoration:none;">${img}</a>`
        : img;
      return `<div style="padding:${block.paddingY}px 0;text-align:${block.alignment};">${wrapped}</div>`;
    }
    case "button":
      return `<div style="padding:${block.paddingY}px 0;text-align:${block.alignment};">
        <a href="${escapeHtml(block.href)}" style="display:inline-block;background:${block.background};color:${block.textColor};text-decoration:none;padding:14px 28px;border-radius:${block.radius}px;font-size:14px;font-weight:600;">${renderInline(
        block.text,
        vars,
      )}</a>
      </div>`;
    case "divider":
      return `<div style="padding:${block.paddingY}px 0;"><hr style="border:0;border-top:${block.thickness}px solid ${block.color};margin:0;" /></div>`;
    case "spacer":
      return `<div style="height:${block.height}px;line-height:${block.height}px;font-size:1px;">&nbsp;</div>`;
    case "columns": {
      const left = block.left.map((b) => renderBlockHtml(b, vars)).join("");
      const right = block.right.map((b) => renderBlockHtml(b, vars)).join("");
      return `<div style="padding:${block.paddingY}px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr>
            <td valign="top" style="width:50%;padding-right:${block.gap / 2}px;">${left}</td>
            <td valign="top" style="width:50%;padding-left:${block.gap / 2}px;">${right}</td>
          </tr>
        </table>
      </div>`;
    }
  }
};

export const renderDocumentHtml = (doc: TemplateDocument, vars?: Partial<TemplateVariableValues>) => {
  const inner = doc.blocks.map((b) => renderBlockHtml(b, vars)).join("");
  return `<div style="background:${doc.background};padding:24px 12px;font-family:${doc.fontFamily};">
    <div style="max-width:${doc.width}px;margin:0 auto;background:${doc.contentBackground};border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
      ${inner}
    </div>
  </div>`;
};

const blockToPlain = (block: Block, vars?: Partial<TemplateVariableValues>): string => {
  const replace = (s: string) => replaceTemplateVariables(s, vars);
  switch (block.type) {
    case "heading":
      return replace(block.text).toUpperCase();
    case "text":
      return replace(block.text);
    case "image":
      return block.alt ? `[${replace(block.alt)}]${block.href ? ` (${block.href})` : ""}` : "";
    case "button":
      return `${replace(block.text)}: ${block.href}`;
    case "divider":
      return "----------------------------------------";
    case "spacer":
      return "";
    case "columns":
      return [
        ...block.left.map((b) => blockToPlain(b, vars)),
        ...block.right.map((b) => blockToPlain(b, vars)),
      ]
        .filter(Boolean)
        .join("\n\n");
  }
};

export const renderDocumentPlain = (doc: TemplateDocument, vars?: Partial<TemplateVariableValues>) =>
  doc.blocks.map((b) => blockToPlain(b, vars)).filter(Boolean).join("\n\n");

export const isTemplateDocument = (value: unknown): value is TemplateDocument => {
  if (!value || typeof value !== "object") return false;
  const v = value as { version?: unknown; blocks?: unknown };
  return v.version === 1 && Array.isArray(v.blocks);
};

/**
 * Convert any legacy template (plain text or visual config) into a block document
 * by wrapping its body as a single text block, preserving prior content.
 */
export const wrapLegacyAsDocument = (body: string): TemplateDocument => {
  const doc = createEmptyDocument();
  doc.blocks = [
    {
      ...(createBlock("text") as TextBlock),
      text: body || "",
    },
  ];
  return doc;
};

/* Brand themes */

export type BrandTheme = {
  id: string;
  user_id: string;
  name: string;
  brand_name: string;
  primary_color: string;
  background_color: string;
  heading_font: string;
  body_font: string;
  button_style: { radius: number; textColor: string; background: string };
  footer_style: { text: string; color: string; alignment: Alignment };
  created_at: string;
  updated_at: string;
};

export const applyThemeToDocument = (doc: TemplateDocument, theme: BrandTheme): TemplateDocument => {
  const next: TemplateDocument = {
    ...doc,
    background: theme.background_color,
    fontFamily: theme.body_font,
  };
  const restyle = (blocks: Block[]): Block[] =>
    blocks.map((b) => {
      if (b.type === "heading") {
        return { ...b, color: theme.primary_color };
      }
      if (b.type === "button") {
        return {
          ...b,
          background: theme.button_style.background || theme.primary_color,
          textColor: theme.button_style.textColor,
          radius: theme.button_style.radius,
        };
      }
      if (b.type === "columns") {
        return { ...b, left: restyle(b.left), right: restyle(b.right) };
      }
      return b;
    });
  next.blocks = restyle(next.blocks);
  return next;
};

/* Block helpers for editor */

export const findAndUpdateBlock = (
  blocks: Block[],
  id: BlockId,
  updater: (b: Block) => Block,
): Block[] =>
  blocks.map((b) => {
    if (b.id === id) return updater(b);
    if (b.type === "columns") {
      return {
        ...b,
        left: findAndUpdateBlock(b.left, id, updater),
        right: findAndUpdateBlock(b.right, id, updater),
      };
    }
    return b;
  });

export const removeBlock = (blocks: Block[], id: BlockId): Block[] =>
  blocks
    .filter((b) => b.id !== id)
    .map((b) =>
      b.type === "columns"
        ? { ...b, left: removeBlock(b.left, id), right: removeBlock(b.right, id) }
        : b,
    );

export const duplicateBlockById = (blocks: Block[], id: BlockId): Block[] => {
  const result: Block[] = [];
  for (const b of blocks) {
    if (b.id === id) {
      result.push(b, cloneBlock(b));
    } else if (b.type === "columns") {
      result.push({
        ...b,
        left: duplicateBlockById(b.left, id),
        right: duplicateBlockById(b.right, id),
      });
    } else {
      result.push(b);
    }
  }
  return result;
};

export const blockTypeLabels: Record<BlockType, string> = {
  heading: "Heading",
  text: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
  columns: "2 Columns",
};