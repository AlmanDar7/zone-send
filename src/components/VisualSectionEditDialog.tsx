import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VisualTemplateConfig } from "@/lib/template-presets";
import {
  visualSectionMeta,
  type VisualSectionId,
} from "@/lib/visual-template-sections";

type Props = {
  sectionId: VisualSectionId | null;
  config: VisualTemplateConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: <K extends keyof VisualTemplateConfig>(key: K, value: VisualTemplateConfig[K]) => void;
};

const VisualSectionEditDialog = ({
  sectionId,
  config,
  open,
  onOpenChange,
  onUpdate,
  onClose,
}: Props & { onClose: () => void }) => {
  if (!sectionId) return null;

  const meta = visualSectionMeta[sectionId];

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base">Edit {meta.label}</DialogTitle>
          <DialogDescription className="text-xs">{meta.hint}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,480px)] space-y-4 overflow-y-auto px-5 py-4">
          {sectionId === "brand" && (
            <Field label="Brand name">
              <Input
                value={config.brandName}
                onChange={(e) => onUpdate("brandName", e.target.value)}
                autoFocus
              />
            </Field>
          )}

          {sectionId === "eyebrow" && (
            <Field label="Eyebrow text">
              <Input
                value={config.eyebrow}
                onChange={(e) => onUpdate("eyebrow", e.target.value)}
                autoFocus
              />
            </Field>
          )}

          {sectionId === "hero" && (
            <Field label="Image URL">
              <Input
                value={config.heroImageUrl}
                onChange={(e) => onUpdate("heroImageUrl", e.target.value)}
                placeholder="https://..."
                autoFocus
              />
            </Field>
          )}

          {sectionId === "headline" && (
            <Field label="Headline">
              <Textarea
                value={config.headline}
                onChange={(e) => onUpdate("headline", e.target.value)}
                rows={3}
                autoFocus
              />
            </Field>
          )}

          {sectionId === "subheadline" && (
            <Field label="Subheadline">
              <Textarea
                value={config.subheadline}
                onChange={(e) => onUpdate("subheadline", e.target.value)}
                rows={3}
                autoFocus
              />
            </Field>
          )}

          {sectionId === "body" && (
            <Field label="Main copy">
              <Textarea
                value={config.body}
                onChange={(e) => onUpdate("body", e.target.value)}
                rows={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{FirstName}}"} and {"{{CompanyName}}"} for personalization.
              </p>
            </Field>
          )}

          {sectionId === "cta" && (
            <>
              <Field label="Button text">
                <Input
                  value={config.ctaText}
                  onChange={(e) => onUpdate("ctaText", e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Button link">
                <Input
                  value={config.ctaUrl}
                  onChange={(e) => onUpdate("ctaUrl", e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </>
          )}

          {sectionId === "secondary" && (
            <>
              <Field label="Section title">
                <Input
                  value={config.secondaryTitle}
                  onChange={(e) => onUpdate("secondaryTitle", e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Section body">
                <Textarea
                  value={config.secondaryBody}
                  onChange={(e) => onUpdate("secondaryBody", e.target.value)}
                  rows={4}
                />
              </Field>
            </>
          )}

          {sectionId === "footer" && (
            <Field label="Footer note">
              <Textarea
                value={config.footerNote}
                onChange={(e) => onUpdate("footerNote", e.target.value)}
                rows={3}
                autoFocus
              />
            </Field>
          )}

          {sectionId === "style" && (
            <>
              <Field label="Accent color">
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => onUpdate("accentColor", e.target.value)}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={config.accentColor}
                    onChange={(e) => onUpdate("accentColor", e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Background color">
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => onUpdate("backgroundColor", e.target.value)}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={config.backgroundColor}
                    onChange={(e) => onUpdate("backgroundColor", e.target.value)}
                  />
                </div>
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-3 sm:justify-end">
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default VisualSectionEditDialog;
