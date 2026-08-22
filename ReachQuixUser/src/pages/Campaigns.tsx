import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Play, Pause, Square, MoreHorizontal, Trash2, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import PageToolbar from "@/components/PageToolbar";
import ContentCard from "@/components/ContentCard";
import CampaignStepsPanel from "@/components/CampaignStepsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startQueueProcessor } from "@/lib/queueProcessor";
import { getSmtpConfigError, hasUsableSmtpConfig } from "@/lib/smtpValidation";
import {
  campaignNameDuplicateMessage,
  isCampaignNameTaken,
  parseCampaignNameConflict,
  partitionDuplicateCampaigns,
} from "@/lib/campaign-names";
import WorkflowDetailSheet from "@/components/WorkflowDetailSheet";

const statusColors: Record<string, string> = {
  Running: "bg-success/10 text-success",
  Paused: "bg-warning/10 text-warning",
  Draft: "bg-muted text-muted-foreground",
  Completed: "bg-info/10 text-info",
  Scheduled: "bg-info/10 text-info border border-info/20",
};

type CampaignStep = any;
type TimingDraft = { value: string; unit: "days" | "hours" };

const getStepTiming = (step: CampaignStep): { value: number; unit: "days" | "hours" } => ({
  value:
    typeof step.delay_value === "number"
      ? step.delay_value
      : typeof step.delay_days === "number"
        ? step.delay_days
        : 0,
  unit: step.delay_unit === "hours" ? "hours" : "days",
});

const formatStepDelay = (step: CampaignStep) => {
  const timing = getStepTiming(step);

  if (timing.value === 0) return "Send immediately";

  const suffix = timing.value === 1 ? timing.unit.slice(0, -1) : timing.unit;
  return `Send after ${timing.value} ${suffix}`;
};

interface CampaignsProps {
  variant?: "campaigns" | "workflows";
}

const Campaigns = ({ variant = "campaigns" }: CampaignsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isWorkflowsPage =
    variant === "workflows" || location.pathname.startsWith("/workflows");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [dailyLimit, setDailyLimit] = useState("500");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [timingDrafts, setTimingDrafts] = useState<Record<string, TimingDraft>>({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      const data = await api.campaigns.list();
      return data;
    },
    enabled: !!user,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-list", user?.id],
    queryFn: async () => {
      const data = await api.templates.list('email');
      return data;
    },
    enabled: !!user,
  });

  const { data: allSteps = [] } = useQuery({
    queryKey: ["campaign-steps", user?.id],
    queryFn: async () => {
      const data = await api.campaigns.steps.listAll();
      return data;
    },
    enabled: !!user,
  });

  const { data: smtpSettings } = useQuery({
    queryKey: ["campaigns-smtp", user?.id],
    queryFn: async () => {
      const data = await api.settings.smtp.get();
      return data;
    },
    enabled: !!user,
  });

  const trimmedNewName = newName.trim();
  const isNewNameTaken = useMemo(
    () => isCampaignNameTaken(trimmedNewName, campaigns),
    [trimmedNewName, campaigns],
  );

  const createCampaign = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error("Workflow name is required");
      if (isCampaignNameTaken(name, campaigns)) {
        throw new Error(campaignNameDuplicateMessage(name));
      }

      const data = await api.campaigns.create({
        name,
        daily_limit: parseInt(dailyLimit) || 500,
        steps: [
          { step_number: 1, delay_days: 0, delay_value: 0, delay_unit: "days" },
          { step_number: 2, delay_days: 2, delay_value: 2, delay_unit: "days" },
          { step_number: 3, delay_days: 4, delay_value: 4, delay_unit: "days" },
          { step_number: 4, delay_days: 7, delay_value: 7, delay_unit: "days" },
          { step_number: 5, delay_days: 14, delay_value: 14, delay_unit: "days" },
        ]
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-steps"] });
      setCreateOpen(false);
      setNewName("");
      if (isWorkflowsPage && data?.id) {
        setExpandedCampaign(data.id);
      }
      toast.success(
        isWorkflowsPage
          ? "Workflow created with 5 follow-up steps!"
          : "Campaign created with 5 follow-up steps!",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const assignTemplate = useMutation({
    mutationFn: async ({ stepId, templateId }: { stepId: string; templateId: string | null }) => {
      await api.campaigns.steps.update(stepId, templateId || '', { template_id: templateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-steps"] });
      toast.success("Template assigned!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStepTiming = useMutation({
    mutationFn: async ({ stepId, delayValue, delayUnit }: { stepId: string; delayValue: number; delayUnit: "days" | "hours" }) => {
      await api.campaigns.steps.update(stepId, '', {
        delay_value: delayValue,
        delay_unit: delayUnit,
        delay_days: delayUnit === "days" ? delayValue : 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-steps"] });
      toast.success("Follow-up timing updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (status === "Running" && !hasUsableSmtpConfig(smtpSettings)) {
        throw new Error(getSmtpConfigError());
      }

      await api.campaigns.update(id, { status });

      if (status === "Running") {
        return startQueueProcessor(id);
      }

      return { continuedInBackground: false, failed: 0 };
    },
    onSuccess: ({ continuedInBackground, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (continuedInBackground) {
        toast.success("Campaign updated. Email processing is continuing in the background.");
        return;
      }

      if (failed > 0) {
        toast.error(`${failed} email${failed === 1 ? "" : "s"} failed to send. Check Email Queue for the error details.`);
        return;
      }

      toast.success("Campaign updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await api.campaigns.delete(id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (expandedCampaign === id) setExpandedCampaign(null);
      toast.success("Campaign deleted");
    },
  });

  const removeDuplicateWorkflows = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.campaigns.delete(id);
      }
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-steps"] });
      if (expandedCampaign && ids.includes(expandedCampaign)) setExpandedCampaign(null);
      toast.success(`Removed ${ids.length} duplicate workflow${ids.length === 1 ? "" : "s"}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getStepsForCampaign = (campaignId: string) =>
    allSteps.filter((s: any) => s.campaign_id === campaignId);

  const getTemplateName = (templateId: string | null) => {
    if (!templateId) return null;
    const t = templates.find((t: any) => t.id === templateId);
    return t ? t.name : null;
  };

  const filteredCampaigns = useMemo(() => {
    const list = campaigns.filter((c: { name: string; status: string }) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
    return [...list].sort((a: { name: string; created_at: string }, b: { name: string; created_at: string }) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [campaigns, search, sortBy, statusFilter]);

  const { displayCampaigns, duplicateWorkflowIds } = useMemo(() => {
    if (!isWorkflowsPage) {
      return { displayCampaigns: filteredCampaigns, duplicateWorkflowIds: [] as string[] };
    }
    const { unique, duplicateIds } = partitionDuplicateCampaigns(filteredCampaigns);
    return { displayCampaigns: unique, duplicateWorkflowIds: duplicateIds };
  }, [filteredCampaigns, isWorkflowsPage]);

  const statusLabel = (campaign: { status: string; updated_at?: string; created_at: string }) => {
    const edited = campaign.updated_at || campaign.created_at;
    const ago = formatDistanceToNow(new Date(edited), { addSuffix: false });
    return `${campaign.status} · last edited ${ago} ago`;
  };

  const expandedCampaignData = expandedCampaign
    ? campaigns.find((c: { id: string }) => c.id === expandedCampaign)
    : null;

  const renderStepsPanel = (campaignId: string) => {
    const steps = getStepsForCampaign(campaignId);
    return (
      <CampaignStepsPanel
        steps={steps}
        templates={templates}
        timingDrafts={timingDrafts}
        onTimingDraftChange={(stepId, draft) =>
          setTimingDrafts((prev) => ({ ...prev, [stepId]: draft }))
        }
        onSaveTiming={(stepId, delayValue, delayUnit) =>
          updateStepTiming.mutate({ stepId, delayValue, delayUnit })
        }
        onAssignTemplate={(stepId, templateId) =>
          assignTemplate.mutate({ stepId, templateId })
        }
        formatStepDelay={formatStepDelay}
        getTemplateName={getTemplateName}
        isSavingTiming={updateStepTiming.isPending}
      />
    );
  };

  return (
    <div>
      <PageToolbar
        title={isWorkflowsPage ? "My workflows" : "My campaigns"}
        search={search}
        onSearchChange={setSearch}
        sortValue={sortBy}
        onSortChange={setSortBy}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "all", label: "All" },
          { value: "draft", label: "Draft" },
          { value: "running", label: "Running" },
          { value: "paused", label: "Paused" },
          { value: "completed", label: "Completed" },
        ]}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        primaryAction={
          isWorkflowsPage
            ? { label: "+ New workflow", onClick: () => setCreateOpen(true) }
            : { label: "+ New campaign", onClick: () => navigate("/campaigns/new") }
        }
        extraActions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          {!isWorkflowsPage && (
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-muted-foreground sm:inline-flex">
                Sequence
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isWorkflowsPage ? "Create workflow" : "Create campaign"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{isWorkflowsPage ? "Workflow name" : "Campaign name"}</Label>
                <Input
                  placeholder="Q1 SaaS Outreach"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={isNewNameTaken ? "border-destructive" : undefined}
                />
                {isNewNameTaken && (
                  <p className="text-xs text-destructive">
                    {campaignNameDuplicateMessage(trimmedNewName)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Daily Sending Limit</Label>
                <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
              </div>
              {isWorkflowsPage && campaigns.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Names already used</p>
                  <p className="mt-1">
                    {campaigns.map((c: { name: string }) => c.name).join(" · ")}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {isWorkflowsPage
                  ? "Each workflow name must be unique on this page. 5 follow-up steps are created automatically."
                  : "Each campaign name must be unique. 5 follow-up steps are created automatically."}
              </p>
              <Button
                onClick={() => createCampaign.mutate()}
                disabled={createCampaign.isPending || !trimmedNewName || isNewNameTaken}
              >
                {createCampaign.isPending
                  ? "Creating..."
                  : isWorkflowsPage
                    ? "Create workflow"
                    : "Create campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      <div className="w-full px-4 py-8 sm:px-6 lg:px-10">
      {isWorkflowsPage && duplicateWorkflowIds.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm text-foreground">
            You have {duplicateWorkflowIds.length} duplicate workflow
            {duplicateWorkflowIds.length === 1 ? "" : "s"} with the same name. Only one sequence per
            name is allowed.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={removeDuplicateWorkflows.isPending}
            onClick={() => removeDuplicateWorkflows.mutate(duplicateWorkflowIds)}
          >
            Remove duplicates
          </Button>
        </div>
      )}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">
            {isWorkflowsPage
              ? "No workflows yet. Create one with a unique name to start your email sequence."
              : "No campaigns yet. Create one to start sending emails."}
          </p>
          {isWorkflowsPage && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              + New workflow
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayCampaigns.map((campaign: any) => {
                const isExpanded = expandedCampaign === campaign.id;
                return (
                  <ContentCard
                    key={campaign.id}
                    title={campaign.name}
                    statusLabel={statusLabel(campaign)}
                    previewSubtitle="Email sequence"
                    previewTitle={
                      campaign.name.length > 28 ? campaign.name.slice(0, 28) + "…" : campaign.name
                    }
                    selected={isExpanded}
                    onClick={() => setExpandedCampaign(campaign.id)}
                  />
                );
              })}
            </div>

            {isWorkflowsPage ? (
              <WorkflowDetailSheet
                open={!!expandedCampaign}
                onOpenChange={(open) => {
                  if (!open) setExpandedCampaign(null);
                }}
                campaign={expandedCampaignData ?? null}
                steps={expandedCampaign ? getStepsForCampaign(expandedCampaign) : []}
                templates={templates}
                timingDrafts={timingDrafts}
                assignedCount={
                  expandedCampaign
                    ? getStepsForCampaign(expandedCampaign).filter((s) => s.template_id).length
                    : 0
                }
                onTimingDraftChange={(stepId, draft) =>
                  setTimingDrafts((prev) => ({ ...prev, [stepId]: draft }))
                }
                onSaveTiming={(stepId, delayValue, delayUnit) =>
                  updateStepTiming.mutate({ stepId, delayValue, delayUnit })
                }
                onAssignTemplate={(stepId, templateId) =>
                  assignTemplate.mutate({ stepId, templateId })
                }
                formatStepDelay={formatStepDelay}
                getTemplateName={getTemplateName}
                isSavingTiming={updateStepTiming.isPending}
                onViewAnalytics={() =>
                  expandedCampaign && navigate(`/analytics?campaign=${expandedCampaign}`)
                }
                onPause={() =>
                  expandedCampaign &&
                  updateStatus.mutate({ id: expandedCampaign, status: "Paused" })
                }
                onStart={() =>
                  expandedCampaign &&
                  updateStatus.mutate({ id: expandedCampaign, status: "Running" })
                }
                onDelete={() =>
                  expandedCampaign && deleteCampaign.mutate(expandedCampaign)
                }
              />
            ) : (
              <AnimatePresence>
                {expandedCampaign && expandedCampaignData && (
                  <motion.div
                    key={expandedCampaign}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="mt-8"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-foreground">
                          {expandedCampaignData.name}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Assign email templates and timing for each step in this workflow.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/analytics?campaign=${expandedCampaign}`)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View analytics
                        </Button>
                        {expandedCampaignData.status === "Running" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({ id: expandedCampaign, status: "Paused" })
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </Button>
                        )}
                        {(expandedCampaignData.status === "Paused" ||
                          expandedCampaignData.status === "Draft") && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus.mutate({ id: expandedCampaign, status: "Running" })
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                    {renderStepsPanel(expandedCampaign)}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        ) : (
          <div className="space-y-3">
          {filteredCampaigns.map((campaign: any, i: number) => {
            const steps = getStepsForCampaign(campaign.id);
            const isExpanded = expandedCampaign === campaign.id;
            const assignedCount = steps.filter((s: any) => s.template_id).length;

            return (
              <motion.div key={campaign.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display font-semibold text-foreground">{campaign.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status] || statusColors.Draft}`}>{campaign.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Limit: {campaign.daily_limit}/day · Created {new Date(campaign.created_at).toLocaleDateString()} · <span className={assignedCount === steps.length && steps.length > 0 ? "text-success" : "text-warning"}>{assignedCount}/{steps.length} templates assigned</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="View steps & templates"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      {campaign.status === "Running" && (
                        <button onClick={() => updateStatus.mutate({ id: campaign.id, status: "Paused" })} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Pause">
                          <Pause className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      {(campaign.status === "Paused" || campaign.status === "Draft") && (
                        <button onClick={() => updateStatus.mutate({ id: campaign.id, status: "Running" })} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Start">
                          <Play className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      {campaign.status === "Running" && (
                        <button onClick={() => updateStatus.mutate({ id: campaign.id, status: "Completed" })} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Stop">
                          <Square className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/analytics?campaign=${campaign.id}`)}>
                            <BarChart3 className="w-4 h-4 mr-2" />View analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}/report`)}>
                            <BarChart3 className="w-4 h-4 mr-2" />View report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteCampaign.mutate(campaign.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border bg-muted/30 px-5 py-4">
                        {renderStepsPanel(campaign.id)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

export default Campaigns;
