import { BarChart3, Pause, Play, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import CampaignStepsPanel from "@/components/CampaignStepsPanel";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  status: string;
  daily_limit?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
};

type CampaignStep = {
  id: string;
  campaign_id: string;
  step_number: number;
  template_id?: string | null;
  delay_value?: number | null;
  delay_unit?: string | null;
  delay_days?: number | null;
  subject_a?: string | null;
  body_a?: string | null;
  subject_b?: string | null;
  body_b?: string | null;
  ab_test_enabled?: boolean | null;
  winning_variant?: string | null;
  created_at?: string;
};

type TimingDraft = { value: string; unit: "days" | "hours" };
type TemplateOption = { id: string; name: string; type: string; category: string };

const statusStyles: Record<string, string> = {
  Running: "bg-success/15 text-success border-success/20",
  Paused: "bg-warning/15 text-warning border-warning/20",
  Draft: "bg-muted text-muted-foreground border-border",
  Completed: "bg-info/15 text-info border-info/20",
};

interface WorkflowDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
  steps: CampaignStep[];
  templates: TemplateOption[];
  timingDrafts: Record<string, TimingDraft>;
  assignedCount: number;
  onTimingDraftChange: (stepId: string, draft: TimingDraft) => void;
  onSaveTiming: (stepId: string, delayValue: number, delayUnit: "days" | "hours") => void;
  onAssignTemplate: (stepId: string, templateId: string | null) => void;
  formatStepDelay: (step: CampaignStep) => string;
  getTemplateName: (templateId: string | null) => string | null;
  isSavingTiming?: boolean;
  onViewAnalytics: () => void;
  onPause: () => void;
  onStart: () => void;
  onDelete: () => void;
}

const WorkflowDetailSheet = ({
  open,
  onOpenChange,
  campaign,
  steps,
  templates,
  timingDrafts,
  assignedCount,
  onTimingDraftChange,
  onSaveTiming,
  onAssignTemplate,
  formatStepDelay,
  getTemplateName,
  isSavingTiming,
  onViewAnalytics,
  onPause,
  onStart,
  onDelete,
}: WorkflowDetailSheetProps) => {
  const navigate = useNavigate();
  if (!campaign) return null;

  const statusClass = statusStyles[campaign.status] || statusStyles.Draft;
  const progress = steps.length > 0 ? Math.round((assignedCount / steps.length) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 border-l border-border p-0 sm:max-w-[480px]"
      >
        <div className="relative shrink-0 border-b border-border bg-gradient-to-br from-primary/12 via-primary/5 to-background px-6 pb-5 pt-6 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                statusClass,
              )}
            >
              {campaign.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {assignedCount}/{steps.length} templates · {campaign.daily_limit}/day limit
            </span>
          </div>

          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
            {campaign.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your email sequence — assign templates and set delays between steps.
          </p>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Setup progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" className="h-8 shadow-sm" onClick={() => navigate(`/workflows/${campaign.id}/builder`)}>
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Visual Graph Builder
            </Button>
            <Button size="sm" variant="secondary" className="h-8 shadow-sm" onClick={onViewAnalytics}>
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Analytics
            </Button>
            {campaign.status === "Running" && (
              <Button size="sm" variant="outline" className="h-8 bg-background/80" onClick={onPause}>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </Button>
            )}
            {(campaign.status === "Paused" || campaign.status === "Draft") && (
              <Button size="sm" className="h-8" onClick={onStart}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Start
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <CampaignStepsPanel
            variant="sidebar"
            steps={steps}
            templates={templates}
            timingDrafts={timingDrafts}
            onTimingDraftChange={onTimingDraftChange}
            onSaveTiming={onSaveTiming}
            onAssignTemplate={onAssignTemplate}
            formatStepDelay={formatStepDelay}
            getTemplateName={getTemplateName}
            isSavingTiming={isSavingTiming}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WorkflowDetailSheet;
