import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Search, Users, Calendar as CalendarIcon,
  Send, Clock, Sparkles, Monitor, Smartphone, Edit3, Eye, Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import StepIndicator from "@/components/wizard/StepIndicator";
import SuccessModal from "@/components/wizard/SuccessModal";
import TemplatePreview from "@/components/TemplatePreview";
import BlockEditor from "@/components/BlockEditor";
import TimezoneSelector from "@/components/TimezoneSelector";
import {
  createEmptyDocument, isTemplateDocument, renderDocumentHtml, renderDocumentPlain,
  buildDocumentFromLegacy, type TemplateDocument,
} from "@/lib/template-blocks";
import { replaceTemplateVariables } from "@/lib/template-presets";

type EmailRow = Database["public"]["Tables"]["email_templates"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type FolderRow = Database["public"]["Tables"]["contact_folders"]["Row"];

const STEPS = ["Template", "Audience", "Details", "Schedule"];

const CampaignWizard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [selectedTemplate, setSelectedTemplate] = useState<EmailRow | null>(null);
  const [editorDoc, setEditorDoc] = useState<TemplateDocument | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Step 2
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [audienceTab, setAudienceTab] = useState<"folders" | "contacts">("folders");

  // Step 3
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  // Step 4
  const [sendMode, setSendMode] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [timezone, setTimezone] = useState("UTC");

  // Success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [successMeta, setSuccessMeta] = useState<{ recipients: number; scheduledAt: Date | null }>({
    recipients: 0,
    scheduledAt: null,
  });

  /* ----------------- Data ----------------- */
  const { data: templates = [], isLoading: tLoad } = useQuery({
    queryKey: ["wizard-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailRow[];
    },
    enabled: !!user,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["wizard-folders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("contact_folders").select("*").order("name");
      return (data || []) as FolderRow[];
    },
    enabled: !!user,
  });

  const { data: folderMembers = [] } = useQuery({
    queryKey: ["wizard-folder-members", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("contact_folder_members").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["wizard-contacts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").eq("status", "Active").order("name");
      return (data || []) as ContactRow[];
    },
    enabled: !!user,
  });

  const { data: smtp } = useQuery({
    queryKey: ["wizard-smtp", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("smtp_settings").select("*").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (smtp && !senderEmail) {
      setSenderEmail(smtp.from_email || smtp.username || "");
      setSenderName(smtp.from_name || "");
    }
  }, [smtp]); // eslint-disable-line

  // Recipient count derived from selections
  const recipientIds = useMemo(() => {
    const ids = new Set<string>();
    folderMembers.forEach((m: any) => {
      if (selectedFolderIds.has(m.folder_id)) ids.add(m.contact_id);
    });
    selectedContactIds.forEach((id) => ids.add(id));
    // Filter to known active contacts
    const active = new Set(contacts.map((c) => c.id));
    return Array.from(ids).filter((id) => active.has(id));
  }, [selectedFolderIds, selectedContactIds, folderMembers, contacts]);

  /* ----------------- Step 1 helpers ----------------- */
  const toDoc = (t: EmailRow): TemplateDocument => {
    if (isTemplateDocument(t.blocks)) return t.blocks as TemplateDocument;
    const cfg = (t.design_config as any) || {};
    return buildDocumentFromLegacy(t.body || "", {
      heading: cfg.headline || t.name,
      ctaText: cfg.ctaText || cfg.ctaLabel,
      ctaHref: cfg.ctaUrl,
      heroImageUrl: cfg.heroImageUrl,
      eyebrow: cfg.eyebrow,
      subheadline: cfg.subheadline,
      footerNote: cfg.footerNote,
    });
  };

  const startEditing = (t: EmailRow) => {
    setSelectedTemplate(t);
    setEditorDoc(toDoc(t));
    if (!subject) setSubject(t.subject);
    if (!campaignName) setCampaignName(t.name);
    setEditing(true);
  };

  const pickAndContinue = (t: EmailRow) => {
    setSelectedTemplate(t);
    setEditorDoc(toDoc(t));
    if (!subject) setSubject(t.subject);
    if (!campaignName) setCampaignName(t.name);
    setStep(2);
  };

  const renderedHtml = useMemo(
    () => (editorDoc ? renderDocumentHtml(editorDoc) : selectedTemplate?.html_body || ""),
    [editorDoc, selectedTemplate],
  );
  const renderedPlain = useMemo(
    () => (editorDoc ? renderDocumentPlain(editorDoc) : selectedTemplate?.body || ""),
    [editorDoc, selectedTemplate],
  );

  /* ----------------- Send ----------------- */
  const sendCampaign = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!selectedTemplate) throw new Error("Pick a template");
      if (recipientIds.length === 0) throw new Error("Select at least one recipient");
      if (!campaignName) throw new Error("Campaign name required");
      if (!subject) throw new Error("Subject required");

      let scheduledAt = new Date();
      if (sendMode === "later") {
        if (!scheduleDate) throw new Error("Pick a date");
        const [h, m] = scheduleTime.split(":").map(Number);
        scheduledAt = new Date(scheduleDate);
        scheduledAt.setHours(h || 9, m || 0, 0, 0);
        if (scheduledAt.getTime() < Date.now()) throw new Error("Schedule must be in the future");
      }

      // Persist edited template
      const blocksToSave = editorDoc;
      const html = blocksToSave ? renderDocumentHtml(blocksToSave) : selectedTemplate.html_body;
      const plain = blocksToSave ? renderDocumentPlain(blocksToSave) : selectedTemplate.body;

      await supabase
        .from("email_templates")
        .update({
          subject,
          body: plain,
          html_body: html,
          blocks: blocksToSave as any,
          template_format: blocksToSave ? "blocks" : selectedTemplate.template_format,
        })
        .eq("id", selectedTemplate.id);

      // Create campaign
      const { data: campaign, error: cErr } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: campaignName,
          status: sendMode === "now" ? "Running" : "Draft",
        })
        .select()
        .single();
      if (cErr) throw cErr;

      // Single step pointing to template
      const { error: sErr } = await supabase.from("campaign_steps").insert({
        campaign_id: campaign.id,
        step_number: 1,
        delay_value: 0,
        delay_unit: "days",
        delay_days: 0,
        template_id: selectedTemplate.id,
      });
      if (sErr) throw sErr;

      // Tag recipient contacts to this campaign
      await supabase
        .from("contacts")
        .update({ campaign_id: campaign.id })
        .in("id", recipientIds);

      // Queue rows
      const queueRows = recipientIds.map((cid) => ({
        user_id: user.id,
        campaign_id: campaign.id,
        contact_id: cid,
        step_number: 1,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending" as const,
      }));
      // Insert in chunks
      for (let i = 0; i < queueRows.length; i += 500) {
        const chunk = queueRows.slice(i, i + 500);
        const { error: qErr } = await supabase.from("email_queue").insert(chunk);
        if (qErr) throw qErr;
      }

      // Trigger processor immediately if sending now
      if (sendMode === "now") {
        await supabase.functions.invoke("process-email-queue", { body: { campaignId: campaign.id } });
      }

      return { campaignId: campaign.id, scheduledAt: sendMode === "later" ? scheduledAt : null };
    },
    onSuccess: ({ campaignId, scheduledAt }) => {
      setCreatedCampaignId(campaignId);
      setSuccessMeta({ recipients: recipientIds.length, scheduledAt });
      setSuccessOpen(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ----------------- Step nav ----------------- */
  const canContinue = () => {
    if (step === 1) return !!selectedTemplate;
    if (step === 2) return recipientIds.length > 0;
    if (step === 3) return !!campaignName && !!subject && !!senderEmail;
    if (step === 4) return sendMode === "now" || !!scheduleDate;
    return false;
  };

  const next = () => {
    if (!canContinue()) return;
    if (step < 4) setStep(step + 1);
    else sendCampaign.mutate();
  };

  const previewWidthClass = previewDevice === "mobile" ? "max-w-[380px]" : "max-w-[680px]";

  /* ----------------- Render ----------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Exit
        </Button>
        <div className="flex-1 px-4">
          <StepIndicator current={step} steps={STEPS} onJump={setStep} />
        </div>
        <div className="w-[80px]" />
      </div>

      <div className="relative min-h-[60vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && !editing && (
              <Step1Picker
                templates={templates}
                loading={tLoad}
                selectedId={selectedTemplate?.id || null}
                onPick={pickAndContinue}
                onEdit={startEditing}
              />
            )}

            {step === 1 && editing && editorDoc && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Editing: {selectedTemplate?.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Drag blocks to reorder, click any element to edit.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-full border border-border bg-muted/40 p-1">
                      <button
                        onClick={() => setPreviewDevice("desktop")}
                        className={cn(
                          "flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
                          previewDevice === "desktop" ? "bg-background shadow-sm" : "text-muted-foreground",
                        )}
                      >
                        <Monitor className="h-3.5 w-3.5" /> Desktop
                      </button>
                      <button
                        onClick={() => setPreviewDevice("mobile")}
                        className={cn(
                          "flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
                          previewDevice === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground",
                        )}
                      >
                        <Smartphone className="h-3.5 w-3.5" /> Mobile
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      Back to gallery
                    </Button>
                  </div>
                </div>

                <div className={cn("mx-auto w-full transition-all", previewDevice === "mobile" ? "max-w-[420px]" : "max-w-none")}>
                  <BlockEditor doc={editorDoc} onChange={setEditorDoc} />
                </div>
              </div>
            )}

            {step === 2 && (
              <Step2Audience
                folders={folders}
                folderMembers={folderMembers}
                contacts={contacts}
                selectedFolderIds={selectedFolderIds}
                selectedContactIds={selectedContactIds}
                onToggleFolder={(id) => {
                  const next = new Set(selectedFolderIds);
                  next.has(id) ? next.delete(id) : next.add(id);
                  setSelectedFolderIds(next);
                }}
                onToggleContact={(id) => {
                  const next = new Set(selectedContactIds);
                  next.has(id) ? next.delete(id) : next.add(id);
                  setSelectedContactIds(next);
                }}
                onSelectAllVisible={(ids) => setSelectedContactIds(new Set([...selectedContactIds, ...ids]))}
                onClearAll={() => {
                  setSelectedFolderIds(new Set());
                  setSelectedContactIds(new Set());
                }}
                search={contactSearch}
                onSearchChange={setContactSearch}
                tab={audienceTab}
                onTabChange={setAudienceTab}
                recipientCount={recipientIds.length}
              />
            )}

            {step === 3 && (
              <Step3Details
                campaignName={campaignName}
                onCampaignName={setCampaignName}
                subject={subject}
                onSubject={setSubject}
                previewText={previewText}
                onPreviewText={setPreviewText}
                senderName={senderName}
                onSenderName={setSenderName}
                senderEmail={senderEmail}
                onSenderEmail={setSenderEmail}
                renderedHtml={renderedHtml}
                renderedBody={renderedPlain}
              />
            )}

            {step === 4 && (
              <Step4Schedule
                sendMode={sendMode}
                onSendMode={setSendMode}
                scheduleDate={scheduleDate}
                onScheduleDate={setScheduleDate}
                scheduleTime={scheduleTime}
                onScheduleTime={setScheduleTime}
                timezone={timezone}
                onTimezone={setTimezone}
                summary={{
                  templateName: selectedTemplate?.name || "—",
                  recipients: recipientIds.length,
                  subject,
                  campaignName,
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!(step === 1 && editing) && (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="text-sm text-muted-foreground">
            Step {step} of {STEPS.length}
          </div>
          <Button onClick={next} disabled={!canContinue() || sendCampaign.isPending} className="rounded-full">
            {step < 4 ? (
              <>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : sendCampaign.isPending ? (
              "Sending..."
            ) : sendMode === "now" ? (
              <>
                <Send className="mr-2 h-4 w-4" /> Send now
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" /> Schedule
              </>
            )}
          </Button>
        </div>
      )}

      {step === 1 && editing && (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <Button variant="ghost" onClick={() => setEditing(false)}>Discard edits</Button>
          <Button
            onClick={() => {
              setEditing(false);
              setStep(2);
            }}
            className="rounded-full"
          >
            Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        campaignName={campaignName}
        recipients={successMeta.recipients}
        scheduledAt={successMeta.scheduledAt}
        onViewAnalytics={() => createdCampaignId && navigate(`/campaigns/${createdCampaignId}/report`)}
        onBackToDashboard={() => navigate("/dashboard")}
      />
    </div>
  );
};

/* =================== STEP 1 =================== */
const Step1Picker = ({
  templates, loading, selectedId, onPick, onEdit,
}: {
  templates: EmailRow[]; loading: boolean; selectedId: string | null;
  onPick: (t: EmailRow) => void; onEdit: (t: EmailRow) => void;
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground">Choose your template</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a starting point. You can fully customize before sending.
      </p>
    </div>

    {loading ? (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
        ))}
      </div>
    ) : templates.length === 0 ? (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          No templates yet. Create one in the Emails section first.
        </p>
      </Card>
    ) : (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t, i) => {
          const selected = selectedId === t.id;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
                selected ? "border-primary ring-2 ring-primary/30" : "border-border",
              )}
            >
              <div className="relative h-56 overflow-hidden bg-muted/30">
                <TemplatePreview
                  html={t.html_body} body={t.body} scaled
                  className="h-full w-full !rounded-none border-0"
                />
                {selected && (
                  <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <h3 className="truncate font-display text-base font-semibold text-foreground">{t.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {replaceTemplateVariables(t.subject)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => onEdit(t)} variant="outline" size="sm" className="flex-1 rounded-full">
                    <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button onClick={() => onPick(t)} size="sm" className="flex-1 rounded-full">
                    Use this
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    )}
  </div>
);

/* =================== STEP 2 =================== */
const Step2Audience = ({
  folders, folderMembers, contacts,
  selectedFolderIds, selectedContactIds,
  onToggleFolder, onToggleContact, onSelectAllVisible, onClearAll,
  search, onSearchChange, tab, onTabChange, recipientCount,
}: {
  folders: FolderRow[]; folderMembers: any[]; contacts: ContactRow[];
  selectedFolderIds: Set<string>; selectedContactIds: Set<string>;
  onToggleFolder: (id: string) => void; onToggleContact: (id: string) => void;
  onSelectAllVisible: (ids: string[]) => void; onClearAll: () => void;
  search: string; onSearchChange: (s: string) => void;
  tab: "folders" | "contacts"; onTabChange: (t: "folders" | "contacts") => void;
  recipientCount: number;
}) => {
  const memberCountByFolder = useMemo(() => {
    const map: Record<string, number> = {};
    folderMembers.forEach((m: any) => { map[m.folder_id] = (map[m.folder_id] || 0) + 1; });
    return map;
  }, [folderMembers]);

  const filteredContacts = contacts.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Who do you want to send to?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick lists or individual contacts.
          </p>
        </div>
        <motion.div
          initial={false}
          animate={{ scale: recipientCount > 0 ? 1 : 0.95 }}
          className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2"
        >
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {recipientCount.toLocaleString()} recipient{recipientCount === 1 ? "" : "s"}
          </span>
        </motion.div>
      </div>

      <Tabs value={tab} onValueChange={(v) => onTabChange(v as any)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="rounded-full bg-muted/60 p-1">
            <TabsTrigger value="folders" className="rounded-full px-4 data-[state=active]:bg-background">
              Lists ({folders.length})
            </TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-full px-4 data-[state=active]:bg-background">
              Contacts ({contacts.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search} onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..." className="rounded-full pl-9 sm:w-[260px]"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={onClearAll}>Clear</Button>
          </div>
        </div>

        <TabsContent value="folders" className="mt-4">
          {folders.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No lists yet. Create one in the Audience section.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders
                .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
                .map((f) => {
                  const selected = selectedFolderIds.has(f.id);
                  const count = memberCountByFolder[f.id] || 0;
                  return (
                    <motion.button
                      type="button"
                      key={f.id}
                      onClick={() => onToggleFolder(f.id)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all",
                        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
                      )}
                    >
                      <div className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                      )}>
                        {selected ? <Check className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{count} contact{count === 1 ? "" : "s"}</p>
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Showing {filteredContacts.length} of {contacts.length}
              </span>
              <Button
                variant="ghost" size="sm"
                onClick={() => onSelectAllVisible(filteredContacts.map((c) => c.id))}
              >
                Select all visible
              </Button>
            </div>
            <div className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {filteredContacts.map((c) => {
                const selected = selectedContactIds.has(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => onToggleContact(c.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}>
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    {c.company_name && (
                      <Badge variant="secondary" className="text-xs">{c.company_name}</Badge>
                    )}
                  </button>
                );
              })}
              {filteredContacts.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No contacts match.</div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* =================== STEP 3 =================== */
const Step3Details = ({
  campaignName, onCampaignName, subject, onSubject, previewText, onPreviewText,
  senderName, onSenderName, senderEmail, onSenderEmail, renderedHtml, renderedBody,
}: {
  campaignName: string; onCampaignName: (v: string) => void;
  subject: string; onSubject: (v: string) => void;
  previewText: string; onPreviewText: (v: string) => void;
  senderName: string; onSenderName: (v: string) => void;
  senderEmail: string; onSenderEmail: (v: string) => void;
  renderedHtml: string; renderedBody: string;
}) => {
  const aiSubject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-email-writer", {
        body: { prompt: `Suggest a short, catchy email subject line for: ${campaignName || subject || "marketing email"}`, type: "subject" },
      });
      if (error) throw error;
      return (data as any)?.subject || (data as any)?.content || "";
    },
    onSuccess: (s: string) => { if (s) onSubject(s.slice(0, 120)); },
    onError: () => toast.error("AI suggestion failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Email details</h2>
        <p className="mt-1 text-sm text-muted-foreground">Set how this email appears in the inbox.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Campaign name (internal)</Label>
            <Input value={campaignName} onChange={(e) => onCampaignName(e.target.value)} placeholder="May Newsletter" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subject line</Label>
              <Button
                size="sm" variant="ghost" className="h-7 px-2 text-xs"
                disabled={aiSubject.isPending} onClick={() => aiSubject.mutate()}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {aiSubject.isPending ? "Thinking..." : "AI suggest"}
              </Button>
            </div>
            <Input value={subject} onChange={(e) => onSubject(e.target.value)} placeholder="Don't miss our spring sale" />
            <p className="text-xs text-muted-foreground">{subject.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label>Preview text</Label>
            <Textarea
              value={previewText} onChange={(e) => onPreviewText(e.target.value)}
              rows={2} placeholder="The teaser shown after the subject in inbox"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Sender name</Label>
              <Input value={senderName} onChange={(e) => onSenderName(e.target.value)} placeholder="Acme Co" />
            </div>
            <div className="space-y-2">
              <Label>Sender email</Label>
              <Input
                type="email" value={senderEmail} onChange={(e) => onSenderEmail(e.target.value)}
                placeholder="hello@acme.co"
              />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/30 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Inbox preview</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {senderName || "Sender"} <span className="font-normal text-muted-foreground">&lt;{senderEmail || "you@example.com"}&gt;</span>
            </p>
            <p className="mt-1 truncate text-base font-bold text-foreground">
              {subject || "Your subject line"}
            </p>
            {previewText && <p className="mt-1 truncate text-xs text-muted-foreground">{previewText}</p>}
          </div>
          <div className="max-h-[420px] overflow-y-auto bg-white">
            {renderedHtml ? (
              <div dangerouslySetInnerHTML={{ __html: replaceTemplateVariables(renderedHtml) }} />
            ) : (
              <div className="p-6 text-sm text-muted-foreground whitespace-pre-wrap">{renderedBody}</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* =================== STEP 4 =================== */
const Step4Schedule = ({
  sendMode, onSendMode, scheduleDate, onScheduleDate, scheduleTime, onScheduleTime,
  timezone, onTimezone, summary,
}: {
  sendMode: "now" | "later"; onSendMode: (m: "now" | "later") => void;
  scheduleDate: Date | undefined; onScheduleDate: (d: Date | undefined) => void;
  scheduleTime: string; onScheduleTime: (t: string) => void;
  timezone: string; onTimezone: (t: string) => void;
  summary: { templateName: string; recipients: number; subject: string; campaignName: string };
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground">When should we send?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Send right away or pick a future time.</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <ModeCard
        active={sendMode === "now"}
        onClick={() => onSendMode("now")}
        icon={<Send className="h-6 w-6" />}
        title="Send Now"
        description="Email goes out immediately to all recipients."
      />
      <ModeCard
        active={sendMode === "later"}
        onClick={() => onSendMode("later")}
        icon={<Clock className="h-6 w-6" />}
        title="Schedule for Later"
        description="Pick a date and time that works best."
      />
    </div>

    <AnimatePresence>
      {sendMode === "later" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start font-normal", !scheduleDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={onScheduleDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={scheduleTime} onChange={(e) => onScheduleTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <TimezoneSelector value={timezone} onChange={onTimezone} compact />
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>

    <Card className="p-5">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm summary</p>
      <div className="space-y-3 text-sm">
        <SummaryRow label="Campaign" value={summary.campaignName || "—"} />
        <SummaryRow label="Template" value={summary.templateName} />
        <SummaryRow label="Subject" value={summary.subject || "—"} />
        <SummaryRow label="Recipients" value={`${summary.recipients.toLocaleString()} contact${summary.recipients === 1 ? "" : "s"}`} />
        <SummaryRow
          label="Schedule"
          value={
            sendMode === "now"
              ? "Immediately"
              : scheduleDate
                ? `${format(scheduleDate, "PPP")} at ${scheduleTime} (${timezone})`
                : "Pick a date"
          }
        />
      </div>
    </Card>
  </div>
);

const ModeCard = ({
  active, onClick, icon, title, description,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string;
}) => (
  <motion.button
    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "flex flex-col items-start gap-3 rounded-2xl border bg-card p-6 text-left shadow-sm transition-all",
      active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
    )}
  >
    <div className={cn(
      "flex h-12 w-12 items-center justify-center rounded-xl",
      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
    )}>
      {icon}
    </div>
    <div>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  </motion.button>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value}</span>
  </div>
);

export default CampaignWizard;
