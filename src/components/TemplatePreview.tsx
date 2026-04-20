import { cn } from "@/lib/utils";
import { replaceTemplateVariables } from "@/lib/template-presets";

type TemplatePreviewProps = {
  html?: string | null;
  body: string;
  className?: string;
  scaled?: boolean;
};

const TemplatePreview = ({ html, body, className, scaled = false }: TemplatePreviewProps) => {
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const fallbackHtml = `<div style="padding:24px;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#334155;white-space:pre-wrap;">${replaceTemplateVariables(
    escapedBody,
  )}</div>`;

  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-border bg-white", className)}>
      <div
        className={cn(scaled && "origin-top scale-[0.58]")}
        style={scaled ? { width: "172%", marginBottom: "-38%" } : undefined}
        dangerouslySetInnerHTML={{ __html: replaceTemplateVariables(html || fallbackHtml) }}
      />
    </div>
  );
};

export default TemplatePreview;
