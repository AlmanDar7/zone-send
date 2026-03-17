import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Pause, Square, MoreHorizontal, Trash2, ChevronDown, ChevronUp, Mail, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Running: "bg-success/10 text-success",
  Paused: "bg-warning/10 text-warning",
  Draft: "bg-muted text-muted-foreground",
  Completed: "bg-info/10 text-info",
};

const stepLabels: Record<number, string> = {
  1: "Initial Email",
  2: "Follow-Up 1 (+2 days)",
  3: "Follow-Up 2 (+4 days)",
  4: "Follow-Up 3 (+7 days)",
  5: "Final Follow-Up (+14 days)",
};

const Campaigns = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [dailyLimit, setDailyLimit] = useState("500");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("id, name, type");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allSteps = [] } = useQuery({
    queryKey: ["campaign-steps", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_steps")
        .select("*")
        .order("step_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ user_id: user!.id, name: newName, daily_limit: parseInt(dailyLimit) || 500 })
        .select()
        .single();
      if (error) throw error;

      const defaultSteps = [
        { campaign_id: data.id, step_number: 1, delay_days: 0 },
        { campaign_id: data.id, step_number: 2, delay_days: 2 },
        { campaign_id: data.id, step_number: 3, delay_days: 4 },
        { campaign_id: data.id, step_number: 4, delay_days: 7 },
        { campaign_id: data.id, step_number: 5, delay_days: 14 },
      ];
      await supabase.from("campaign_steps").insert(defaultSteps);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-steps"] });
      setCreateOpen(false);
      setNewName("");
      toast.success("Campaign created with 5 follow-up steps!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignTemplate = useMutation({
    mutationFn: async ({ stepId, templateId }: { stepId: string; templateId: string | null }) => {
      const { error } = await supabase
        .from("campaign_steps")
        .update({ template_id: templateId })
        .eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-steps"] });
      toast.success("Template assigned!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
      if (error) throw error;

      if (status === "Running") {
        await supabase.functions.invoke("process-email-queue", { body: { campaignId: id } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
  });

  const getStepsForCampaign = (campaignId: string) =>
    allSteps.filter((s: any) => s.campaign_id === campaignId);

  const getTemplateName = (templateId: string | null) => {
    if (!templateId) return null;
    const t = templates.find((t: any) => t.id === templateId);
    return t ? t.name : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your email sequences</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input placeholder="Q1 SaaS Outreach" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Daily Sending Limit</Label>
                <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">5 follow-up steps will be created automatically (0, 2, 4, 7, 14 days). Assign templates after creation.</p>
              <Button onClick={() => createCampaign.mutate()} disabled={createCampaign.isPending || !newName}>
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="stat-card !p-8 text-center">
          <p className="text-muted-foreground">No campaigns yet. Create one to start sending emails.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any, i: number) => {
            const steps = getStepsForCampaign(campaign.id);
            const isExpanded = expandedCampaign === campaign.id;
            const assignedCount = steps.filter((s: any) => s.template_id).length;

            return (
              <motion.div key={campaign.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card !p-0 overflow-hidden">
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
                      <div className="border-t border-border px-5 py-4 space-y-3 bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Sequence Steps</p>
                        {steps.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No steps found for this campaign.</p>
                        ) : (
                          steps.map((step: any) => {
                            const templateName = getTemplateName(step.template_id);
                            return (
                              <div key={step.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                                  {step.step_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">
                                    {stepLabels[step.step_number] || `Step ${step.step_number}`}
                                  </p>
                                  {templateName && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Mail className="w-3 h-3" /> {templateName}
                                    </p>
                                  )}
                                </div>
                                <Select
                                  value={step.template_id || "none"}
                                  onValueChange={(val) =>
                                    assignTemplate.mutate({
                                      stepId: step.id,
                                      templateId: val === "none" ? null : val,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-[200px] h-9 text-sm">
                                    <SelectValue placeholder="Assign template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No template</SelectItem>
                                    {templates.map((t: any) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.name} ({t.type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })
                        )}
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
  );
};

export default Campaigns;
