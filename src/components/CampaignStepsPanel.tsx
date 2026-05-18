import { Check, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
import { isEmailContent } from "@/lib/content-types";
import { cn } from "@/lib/utils";

type CampaignStep = Database["public"]["Tables"]["campaign_steps"]["Row"];

type TemplateOption = { id: string; name: string; type: string; category: string };

type TimingDraft = { value: string; unit: "days" | "hours" };

const stepLabels: Record<number, string> = {
  1: "Initial Email",
  2: "Follow-Up 1",
  3: "Follow-Up 2",
  4: "Follow-Up 3",
  5: "Final Follow-Up",
};

interface CampaignStepsPanelProps {
  steps: CampaignStep[];
  templates: TemplateOption[];
  timingDrafts: Record<string, TimingDraft>;
  onTimingDraftChange: (stepId: string, draft: TimingDraft) => void;
  onSaveTiming: (stepId: string, delayValue: number, delayUnit: "days" | "hours") => void;
  onAssignTemplate: (stepId: string, templateId: string | null) => void;
  formatStepDelay: (step: CampaignStep) => string;
  getTemplateName: (templateId: string | null) => string | null;
  isSavingTiming?: boolean;
  variant?: "default" | "sidebar";
}

const CampaignStepsPanel = ({
  steps,
  templates,
  timingDrafts,
  onTimingDraftChange,
  onSaveTiming,
  onAssignTemplate,
  formatStepDelay,
  getTemplateName,
  isSavingTiming,
  variant = "default",
}: CampaignStepsPanelProps) => {
  const emailTemplates = templates.filter(isEmailContent);
  const isSidebar = variant === "sidebar";

  const persistTiming = (stepId: string) => {
    const timingDraft = timingDrafts[stepId] || { value: "0", unit: "days" as const };
    onSaveTiming(
      stepId,
      Math.max(0, parseInt(timingDraft.value || "0", 10) || 0),
      timingDraft.unit,
    );
  };

  if (steps.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No steps found for this workflow.
      </p>
    );
  }

  if (isSidebar) {
    return (
      <div className="space-y-1">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Sequence timeline
        </p>
        <ol className="relative space-y-0">
          {steps.map((step, index) => {
            const templateName = getTemplateName(step.template_id);
            const timingDraft = timingDrafts[step.id] || { value: "0", unit: "days" as const };
            const hasTemplate = !!step.template_id;
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className="relative pb-6 pl-9">
                {!isLast && (
                  <span
                    className="absolute left-[15px] top-9 bottom-0 w-px bg-border"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    hasTemplate
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-background text-muted-foreground",
                  )}
                >
                  {hasTemplate ? <Check className="h-4 w-4" /> : step.step_number}
                </span>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {stepLabels[step.step_number] || `Step ${step.step_number}`}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatStepDelay(step)}
                      </p>
                    </div>
                    {hasTemplate && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Ready
                      </span>
                    )}
                  </div>

                  {templateName && (
                    <p className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-foreground">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      {templateName}
                    </p>
                  )}

                  <div className="mt-4 space-y-3 border-t border-border/80 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Delay before send</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={timingDraft.value}
                          onChange={(e) =>
                            onTimingDraftChange(step.id, {
                              ...timingDraft,
                              value: e.target.value,
                            })
                          }
                          onBlur={() => persistTiming(step.id)}
                          className="h-9 w-16 text-sm"
                        />
                        <Select
                          value={timingDraft.unit}
                          onValueChange={(value) => {
                            onTimingDraftChange(step.id, {
                              ...timingDraft,
                              unit: value as "days" | "hours",
                            });
                            persistTiming(step.id);
                          }}
                        >
                          <SelectTrigger className="h-9 flex-1 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Email template</Label>
                      <Select
                        value={step.template_id || "none"}
                        onValueChange={(val) =>
                          onAssignTemplate(step.id, val === "none" ? null : val)
                        }
                      >
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue placeholder="Choose template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No template</SelectItem>
                          {emailTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Email sequence steps
      </p>
      {steps.map((step) => {
        const templateName = getTemplateName(step.template_id);
        const timingDraft = timingDrafts[step.id] || { value: "0", unit: "days" as const };

        return (
          <div
            key={step.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-start"
          >
            <div className="flex items-center gap-3 sm:flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {step.step_number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {stepLabels[step.step_number] || `Step ${step.step_number}`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatStepDelay(step)}</p>
                {templateName && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {templateName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={timingDraft.value}
                  onChange={(e) =>
                    onTimingDraftChange(step.id, { ...timingDraft, value: e.target.value })
                  }
                  className="h-9 w-20 text-sm"
                />
                <Select
                  value={timingDraft.unit}
                  onValueChange={(value) =>
                    onTimingDraftChange(step.id, {
                      ...timingDraft,
                      unit: value as "days" | "hours",
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-[100px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => persistTiming(step.id)}
                  disabled={isSavingTiming}
                >
                  Save timing
                </Button>
              </div>
              <Select
                value={step.template_id || "none"}
                onValueChange={(val) =>
                  onAssignTemplate(step.id, val === "none" ? null : val)
                }
              >
                <SelectTrigger className="h-9 w-full min-w-[200px] text-sm sm:w-[220px]">
                  <SelectValue placeholder="Assign email template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {emailTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampaignStepsPanel;
