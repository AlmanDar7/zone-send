import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { replaceTemplateVariables, type TemplateVariableValues } from "@/lib/template-presets";

type TemplatePreviewProps = {
  html?: string | null;
  body: string;
  className?: string;
  scaled?: boolean;
  variables?: Partial<TemplateVariableValues>;
};

const TemplatePreview = ({ html, body, className, scaled = false, variables }: TemplatePreviewProps) => {
  const finalHtml = useMemo(() => {
    if (html) {
      return replaceTemplateVariables(html, variables);
    }
    
    const escapedBody = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<div style="padding:24px;font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#334155;white-space:pre-wrap;">${replaceTemplateVariables(
      escapedBody,
      variables,
    )}</div>`;
  }, [html, body, variables]);

  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-border bg-white", className)}>
      <div
        className={cn(scaled && "origin-top-left scale-[0.58]")}
        style={scaled ? { width: "172.4%", marginBottom: "-38%" } : undefined}
        dangerouslySetInnerHTML={{ __html: finalHtml }}
      />
    </div>
  );
};

export default TemplatePreview;
