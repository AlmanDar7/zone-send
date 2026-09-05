import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Play, Pause, Trash2, Mail, Clock, Split, Tag,
  Users, CheckCircle2, ChevronRight, Settings, Sparkles, Send,
  FileText, ShieldCheck, HelpCircle, Layers, X, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type WorkflowStepType = "email" | "delay" | "condition" | "action";

export type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  title: string;
  // Email fields
  template_id?: string;
  template_name?: string;
  subject?: string;
  preview_text?: string;
  // Delay fields
  delay_value?: number;
  delay_unit?: "hours" | "days";
  // Condition fields
  condition_type?: "opened_email" | "clicked_link" | "has_tag";
  condition_tag_id?: string;
  // Action fields
  action_type?: "add_tag" | "remove_tag" | "move_segment";
  action_target_id?: string;
  action_target_name?: string;
};

export type WorkflowTrigger = {
  type: "segment_join" | "tag_added" | "form_submit";
  target_id?: string;
  target_name?: string;
};

const WorkflowBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routeWorkflowId } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [workflowName, setWorkflowName] = useState("My Automation Workflow");
  const [workflowStatus, setWorkflowStatus] = useState<"Draft" | "Running" | "Paused">("Draft");
  const [trigger, setTrigger] = useState<WorkflowTrigger>({
    type: "segment_join",
    target_name: "Any Segment / General Audience",
  });
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "step-1",
      type: "email",
      title: "Send Welcome Email",
      subject: "Welcome to our community! 🎉",
      preview_text: "Here is your exclusive guide to get started.",
      delay_value: 0,
      delay_unit: "days",
    },
    {
      id: "step-2",
      type: "delay",
      title: "Time Delay",
      delay_value: 2,
      delay_unit: "days",
    },
    {
      id: "step-3",
      type: "condition",
      title: "Check Engagement",
      condition_type: "opened_email",
    },
  ]);

  // Selected node for sidebar configuration
  const [selectedNode, setSelectedNode] = useState<{ kind: "trigger" } | { kind: "step"; step: WorkflowStep } | null>(null);
  const [addStepModalIndex, setAddStepModalIndex] = useState<number | null>(null);
  const [testSimulationOpen, setTestSimulationOpen] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  // Load backend data for options
  const { data: templates = [] } = useQuery({
    queryKey: ["templates-list", user?.id],
    queryFn: () => api.templates.list("email"),
    enabled: !!user,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["contact-folders", user?.id],
    queryFn: () => api.contacts.folders.list(),
    enabled: !!user,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags", user?.id],
    queryFn: () => api.contacts.tags.list(),
    enabled: !!user,
  });

  // If editing an existing campaign / workflow
  const { data: existingCampaign } = useQuery({
    queryKey: ["workflow-campaign", routeWorkflowId],
    queryFn: async () => {
      if (!routeWorkflowId) return null;
      return api.campaigns.get(routeWorkflowId);
    },
    enabled: !!routeWorkflowId,
  });

  useEffect(() => {
    if (existingCampaign) {
      setWorkflowName(existingCampaign.name);
      setWorkflowStatus(existingCampaign.status as any || "Draft");

      // Populate steps if the campaign has saved steps
      if (existingCampaign.campaignSteps && existingCampaign.campaignSteps.length > 0) {
        const loadedSteps: WorkflowStep[] = [];
        existingCampaign.campaignSteps.forEach((s: any, idx: number) => {
          if (s.delay_value > 0 || s.delay_days > 0) {
            loadedSteps.push({
              id: `step-delay-${s.id || idx}`,
              type: "delay",
              title: "Time Delay",
              delay_value: s.delay_value || s.delay_days || 1,
              delay_unit: (s.delay_unit as any) || "days",
            });
          }
          loadedSteps.push({
            id: `step-email-${s.id || idx}`,
            type: "email",
            title: `Email #${s.step_number}`,
            template_id: s.template_id,
            template_name: s.template?.name,
            subject: s.subject_a || "Outreach Email",
            preview_text: s.preview_text_a || "",
            delay_value: s.delay_value || 0,
            delay_unit: (s.delay_unit as any) || "days",
          });
        });
        if (loadedSteps.length > 0) {
          setSteps(loadedSteps);
        }
      }
    }
  }, [existingCampaign]);

  const handleAddStep = (type: WorkflowStepType) => {
    if (addStepModalIndex === null) return;
    
    let newStep: WorkflowStep;
    const newId = `step-${Date.now()}`;

    switch (type) {
      case "email":
        newStep = {
          id: newId,
          type: "email",
          title: "Send Email",
          subject: "Your scheduled update",
          preview_text: "A quick update from us",
          delay_value: 0,
          delay_unit: "days",
        };
        break;
      case "delay":
        newStep = {
          id: newId,
          type: "delay",
          title: "Time Delay",
          delay_value: 1,
          delay_unit: "days",
        };
        break;
      case "condition":
        newStep = {
          id: newId,
          type: "condition",
          title: "Check Condition",
          condition_type: "opened_email",
        };
        break;
      case "action":
        newStep = {
          id: newId,
          type: "action",
          title: "Audience Action",
          action_type: "add_tag",
        };
        break;
    }

    const nextSteps = [...steps];
    nextSteps.splice(addStepModalIndex + 1, 0, newStep);
    setSteps(nextSteps);
    setAddStepModalIndex(null);
    setSelectedNode({ kind: "step", step: newStep });
    toast.success(`Added ${type} step to workflow`);
  };

  const handleRemoveStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId));
    if (selectedNode && selectedNode.kind === "step" && selectedNode.step.id === stepId) {
      setSelectedNode(null);
    }
    toast.info("Step removed");
  };

  const handleUpdateCurrentStep = (updated: Partial<WorkflowStep>) => {
    if (!selectedNode || selectedNode.kind !== "step") return;
    const nextSteps = steps.map((s) => (s.id === selectedNode.step.id ? { ...s, ...updated } : s));
    setSteps(nextSteps);
    setSelectedNode({
      kind: "step",
      step: { ...selectedNode.step, ...updated },
    });
  };

  const saveWorkflowMutation = useMutation({
    mutationFn: async () => {
      // 1. Create or update campaign
      let campaignId = routeWorkflowId;
      if (!campaignId) {
        const created = await api.campaigns.create({
          name: workflowName,
          status: workflowStatus,
          daily_limit: 1000,
        });
        campaignId = created.id;
      } else {
        await api.campaigns.update(campaignId, {
          name: workflowName,
          status: workflowStatus,
        });
      }

      // 2. Prepare and sync steps atomically
      const emailSteps = steps.filter((s) => s.type === "email");
      const stepPayloads = emailSteps.map((s, idx) => ({
        step_number: idx + 1,
        template_id: s.template_id || (templates[0]?.id || null),
        subject_a: s.subject || "Workflow Email",
        preview_text_a: s.preview_text || "",
        delay_value: s.delay_value || 0,
        delay_unit: s.delay_unit || "days",
        delay_days: s.delay_unit === "days" ? (s.delay_value || 0) : 0,
      }));

      await api.campaigns.steps.sync(campaignId, stepPayloads);

      return campaignId;
    },
    onSuccess: (cid) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-campaign", cid] });
      toast.success("Workflow saved successfully!");
      navigate("/workflows");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save workflow"),
  });

  const runSimulation = () => {
    setSimulating(true);
    setSimulationLogs([]);
    const logs: string[] = [];

    logs.push(`▶ Starting simulation with test contact: alex@northstar.co`);
    logs.push(`✓ Trigger satisfied: ${trigger.target_name || "Audience Join"}`);

    steps.forEach((step, idx) => {
      setTimeout(() => {
        if (step.type === "email") {
          logs.push(`✉️ Step ${idx + 1}: Dispatched "${step.subject}"`);
        } else if (step.type === "delay") {
          logs.push(`⏳ Step ${idx + 1}: Pausing for ${step.delay_value} ${step.delay_unit}`);
        } else if (step.type === "condition") {
          logs.push(`🔀 Step ${idx + 1}: Evaluated condition [${step.condition_type}] -> YES branch taken`);
        } else if (step.type === "action") {
          logs.push(`🏷️ Step ${idx + 1}: Executed action [${step.action_type}]`);
        }
        setSimulationLogs([...logs]);

        if (idx === steps.length - 1) {
          logs.push(`🏁 Workflow execution completed successfully for contact!`);
          setSimulationLogs([...logs]);
          setSimulating(false);
        }
      }, (idx + 1) * 600);
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-muted/20 font-sans overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted" onClick={() => navigate("/workflows")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="h-7 px-2 font-display text-sm font-semibold border-transparent hover:border-border focus:border-primary w-[240px]"
              />
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  workflowStatus === "Running" ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"
                )}
              >
                {workflowStatus}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground px-2">Visual Automation Graph</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => {
              setTestSimulationOpen(true);
              runSimulation();
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Test Simulation
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="rounded-full px-5"
            onClick={() => setWorkflowStatus(workflowStatus === "Running" ? "Paused" : "Running")}
          >
            {workflowStatus === "Running" ? (
              <><Pause className="mr-1.5 h-3.5 w-3.5" /> Pause</>
            ) : (
              <><Play className="mr-1.5 h-3.5 w-3.5" /> Publish Live</>
            )}
          </Button>

          <Button
            size="sm"
            className="rounded-full px-6 bg-primary text-primary-foreground shadow-sm"
            onClick={() => saveWorkflowMutation.mutate()}
            disabled={saveWorkflowMutation.isPending}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save Workflow
          </Button>
        </div>
      </header>

      {/* Main Graph Canvas Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-8 sm:p-12 flex flex-col items-center custom-scrollbar">
          <div className="w-full max-w-xl flex flex-col items-center space-y-0 pb-24">

            {/* 1. TRIGGER NODE */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => setSelectedNode({ kind: "trigger" })}
              className={cn(
                "w-full cursor-pointer rounded-2xl border-2 bg-card p-6 shadow-sm transition-all hover:shadow-md",
                selectedNode?.kind === "trigger" ? "border-primary ring-4 ring-primary/10" : "border-primary/40"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] mb-1">
                      STARTING TRIGGER
                    </Badge>
                    <h3 className="font-semibold text-base text-foreground">
                      {trigger.type === "segment_join" ? "Subscriber Added to Segment" : trigger.type === "tag_added" ? "Tag Assigned to Contact" : "Form Submitted"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {trigger.target_name || "General Audience / All Leads"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </motion.div>

            {/* Initial Connector + Add Step */}
            <div className="flex flex-col items-center">
              <div className="h-8 w-0.5 bg-border" />
              <button
                type="button"
                onClick={() => setAddStepModalIndex(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all"
                title="Add step"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="h-8 w-0.5 bg-border" />
            </div>

            {/* 2. STEPS LIST */}
            {steps.map((step, index) => {
              const isSelected = selectedNode?.kind === "step" && selectedNode.step.id === step.id;

              return (
                <div key={step.id} className="w-full flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => setSelectedNode({ kind: "step", step })}
                    className={cn(
                      "w-full cursor-pointer rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md relative group",
                      isSelected ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-border/80"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            step.type === "email" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            step.type === "delay" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            step.type === "condition" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                            "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {step.type === "email" && <Mail className="h-5 w-5" />}
                          {step.type === "delay" && <Clock className="h-5 w-5" />}
                          {step.type === "condition" && <Split className="h-5 w-5" />}
                          {step.type === "action" && <Tag className="h-5 w-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              STEP {index + 1} · {step.type.toUpperCase()}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm text-foreground mt-0.5">
                            {step.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {step.type === "email" && `Subject: ${step.subject || "No subject set"}`}
                            {step.type === "delay" && `Wait ${step.delay_value} ${step.delay_unit}`}
                            {step.type === "condition" && `Condition: ${step.condition_type?.replace(/_/g, " ")}`}
                            {step.type === "action" && `Action: ${step.action_type?.replace(/_/g, " ")}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStep(step.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Connector between steps */}
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-0.5 bg-border" />
                    <button
                      type="button"
                      onClick={() => setAddStepModalIndex(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all"
                      title="Add step here"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <div className="h-8 w-0.5 bg-border" />
                  </div>
                </div>
              );
            })}

            {/* End Node */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Workflow Completion
            </div>
          </div>
        </main>

        {/* Right Configuration Sidebar */}
        <AnimatePresence>
          {selectedNode && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-96 shrink-0 border-l border-border bg-background p-6 overflow-y-auto flex flex-col shadow-xl z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="font-display font-semibold text-lg text-foreground">
                  {selectedNode.kind === "trigger" ? "Trigger Settings" : "Step Configuration"}
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedNode(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Trigger Editor */}
              {selectedNode.kind === "trigger" && (
                <div className="space-y-6 pt-6 flex-1">
                  <div className="space-y-2">
                    <Label>Trigger Event</Label>
                    <Select
                      value={trigger.type}
                      onValueChange={(val: any) => setTrigger({ ...trigger, type: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="segment_join">Subscriber added to Segment</SelectItem>
                        <SelectItem value="tag_added">Tag added to Contact</SelectItem>
                        <SelectItem value="form_submit">Opt-in Form Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {trigger.type === "segment_join" && (
                    <div className="space-y-2">
                      <Label>Segment Folder</Label>
                      <Select
                        value={trigger.target_id || "all"}
                        onValueChange={(val) => {
                          const folder = folders.find((f: any) => f.id === val);
                          setTrigger({
                            ...trigger,
                            target_id: val,
                            target_name: folder ? folder.name : "All Segments",
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Segment / General Audience</SelectItem>
                          {folders.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {trigger.type === "tag_added" && (
                    <div className="space-y-2">
                      <Label>Trigger Tag</Label>
                      <Select
                        value={trigger.target_id || ""}
                        onValueChange={(val) => {
                          const tag = tags.find((t: any) => t.id === val);
                          setTrigger({
                            ...trigger,
                            target_id: val,
                            target_name: tag ? tag.name : "Any Tag",
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
                        <SelectContent>
                          {tags.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Step Editor */}
              {selectedNode.kind === "step" && (
                <div className="space-y-6 pt-6 flex-1">
                  <div className="space-y-2">
                    <Label>Step Title</Label>
                    <Input
                      value={selectedNode.step.title}
                      onChange={(e) => handleUpdateCurrentStep({ title: e.target.value })}
                    />
                  </div>

                  {/* Email Step Settings */}
                  {selectedNode.step.type === "email" && (
                    <>
                      <div className="space-y-2">
                        <Label>Email Template</Label>
                        <Select
                          value={selectedNode.step.template_id || ""}
                          onValueChange={(val) => {
                            const tmpl = templates.find((t: any) => t.id === val);
                            handleUpdateCurrentStep({
                              template_id: val,
                              template_name: tmpl?.name || "Selected Template",
                              subject: tmpl?.subject || selectedNode.step.subject,
                              preview_text: tmpl?.preview_text || selectedNode.step.preview_text,
                            });
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Choose email template" /></SelectTrigger>
                          <SelectContent>
                            {templates.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Subject Line</Label>
                        <Input
                          value={selectedNode.step.subject || ""}
                          onChange={(e) => handleUpdateCurrentStep({ subject: e.target.value })}
                          placeholder="What will subscribers see?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Preview Text (Preheader)</Label>
                        <Input
                          value={selectedNode.step.preview_text || ""}
                          onChange={(e) => handleUpdateCurrentStep({ preview_text: e.target.value })}
                          placeholder="Short preview summary..."
                        />
                      </div>
                    </>
                  )}

                  {/* Delay Step Settings */}
                  {selectedNode.step.type === "delay" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Delay Duration</Label>
                        <Input
                          type="number"
                          min="1"
                          value={selectedNode.step.delay_value || 1}
                          onChange={(e) => handleUpdateCurrentStep({ delay_value: parseInt(e.target.value, 10) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={selectedNode.step.delay_unit || "days"}
                          onValueChange={(val: any) => handleUpdateCurrentStep({ delay_unit: val })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Condition Step Settings */}
                  {selectedNode.step.type === "condition" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Condition Check</Label>
                        <Select
                          value={selectedNode.step.condition_type || "opened_email"}
                          onValueChange={(val: any) => handleUpdateCurrentStep({ condition_type: val })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="opened_email">Contact opened previous email</SelectItem>
                            <SelectItem value="clicked_link">Contact clicked a link in email</SelectItem>
                            <SelectItem value="has_tag">Contact has specific Tag</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Action Step Settings */}
                  {selectedNode.step.type === "action" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Action</Label>
                        <Select
                          value={selectedNode.step.action_type || "add_tag"}
                          onValueChange={(val: any) => handleUpdateCurrentStep({ action_type: val })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add_tag">Add Tag to Contact</SelectItem>
                            <SelectItem value="remove_tag">Remove Tag from Contact</SelectItem>
                            <SelectItem value="move_segment">Move Contact to Segment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Target Tag / Segment</Label>
                        <Select
                          value={selectedNode.step.action_target_id || ""}
                          onValueChange={(val) => {
                            const item = tags.find((t: any) => t.id === val) || folders.find((f: any) => f.id === val);
                            handleUpdateCurrentStep({
                              action_target_id: val,
                              action_target_name: item?.name || "Target",
                            });
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger>
                          <SelectContent>
                            {tags.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>Tag: {t.name}</SelectItem>
                            ))}
                            {folders.map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>Folder: {f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Add Step Dialog */}
      <Dialog open={addStepModalIndex !== null} onOpenChange={(open) => !open && setAddStepModalIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Workflow Step</DialogTitle>
            <DialogDescription>
              Choose an action or condition to insert into this automation pathway.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {[
              { type: "email" as const, title: "Send Email", desc: "Dispatch an email template", icon: Mail, color: "text-emerald-500 bg-emerald-500/10" },
              { type: "delay" as const, title: "Time Delay", desc: "Wait hours or days", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
              { type: "condition" as const, title: "Condition Branch", desc: "Split based on actions", icon: Split, color: "text-purple-500 bg-purple-500/10" },
              { type: "action" as const, title: "Audience Action", desc: "Tag or move subscriber", icon: Tag, color: "text-blue-500 bg-blue-500/10" },
            ].map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleAddStep(opt.type)}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card text-left transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm"
              >
                <div className={cn("p-2 rounded-lg", opt.color)}>
                  <opt.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{opt.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Simulation Modal */}
      <Dialog open={testSimulationOpen} onOpenChange={setTestSimulationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-5 w-5 text-primary" />
              Live Workflow Simulation
            </DialogTitle>
            <DialogDescription>
              Executing simulated contact delivery through all configured workflow steps.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs space-y-2 max-h-[300px] overflow-y-auto">
            {simulationLogs.map((log, i) => (
              <div key={i} className="leading-relaxed text-foreground animate-fadeIn">
                {log}
              </div>
            ))}
            {simulating && (
              <div className="flex items-center gap-2 text-primary pt-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                Processing next step in pipeline...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSimulationOpen(false)}>
              Close
            </Button>
            <Button onClick={runSimulation} disabled={simulating}>
              Re-run Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowBuilder;
