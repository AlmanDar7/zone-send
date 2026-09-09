import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Search, Users, Calendar as CalendarIcon,
  Send, Clock, Sparkles, Edit3, Folder,
  Upload, FileSpreadsheet, X,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { startQueueProcessor } from "@/lib/queueProcessor";
import { getSmtpConfigError, hasUsableSmtpConfig } from "@/lib/smtpValidation";
import { isCampaignNameTaken, parseCampaignNameConflict } from "@/lib/campaign-names";

import StepIndicator from "@/components/wizard/StepIndicator";
import SuccessModal from "@/components/wizard/SuccessModal";
import TemplatePreview from "@/components/TemplatePreview";
import VisualTemplateCanvas from "@/components/VisualTemplateCanvas";
import TimezoneSelector from "@/components/TimezoneSelector";
import {
  buildVisualTemplateContent,
  getStarterTemplate,
  replaceTemplateVariables,
  sampleTemplateVariables,
  visualTemplatePresets,
  type TemplateVariableValues,
  type VisualTemplateConfig,
  type VisualTemplatePresetId,
} from "@/lib/template-presets";
import { DEFAULT_VISUAL_SECTION_ORDER } from "@/lib/visual-template-sections";
import { isEmailContent } from "@/lib/content-types";

type EmailRow = any;
type ContactRow = any;
type FolderRow = any;

const STEPS = ["Template", "From", "Subject", "Audience", "Send"];
const TOTAL_STEPS = STEPS.length;
const NO_COMPANY_COLUMN = "__none__";
const UNMAPPED_COLUMN = "__unmapped__";

/** Radix Select rejects empty string values — normalize headers from CSV/Excel uploads. */
const normalizeCsvHeaders = (raw: string[]): string[] => {
  const used = new Set<string>();
  return raw.map((header, index) => {
    let base = String(header ?? "").trim() || `Column ${index + 1}`;
    let name = base;
    let suffix = 2;
    while (used.has(name)) {
      name = `${base} (${suffix})`;
      suffix += 1;
    }
    used.add(name);
    return name;
  });
};

const parseDelimitedRows = (text: string): string[][] =>
  text
    .split("\n")
    .map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (ch === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
          continue;
        }
        current += ch;
      }
      result.push(current.trim());
      return result;
    })
    .filter((r) => r.length > 0);

const readSpreadsheetRows = async (file: File): Promise<string[][]> => {
  const buffer = await file.arrayBuffer();
  const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][];
  }

  return parseDelimitedRows(new TextDecoder().decode(buffer));
};

const isVisualTemplateConfig = (value: unknown): value is VisualTemplateConfig => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { presetId?: unknown }).presetId === "string";
};

const toVisualConfig = (t: EmailRow): VisualTemplateConfig => {
  if (isVisualTemplateConfig(t.design_config)) {
    return {
      ...t.design_config,
      sectionOrder: t.design_config.sectionOrder?.length
        ? t.design_config.sectionOrder
        : DEFAULT_VISUAL_SECTION_ORDER,
    };
  }
  const fallback = getStarterTemplate("lead-magnet").design_config as VisualTemplateConfig;
  return {
    ...fallback,
    headline: t.name,
    body: t.body,
    sectionOrder: DEFAULT_VISUAL_SECTION_ORDER,
  };
};

const CampaignWizard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStep = searchParams.get("templateId") ? 2 : 1;
  const [step, setStep] = useState(initialStep);

  // Step 1
  const [selectedTemplate, setSelectedTemplate] = useState<EmailRow | null>(null);
  const [designConfig, setDesignConfig] = useState<VisualTemplateConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<TemplateVariableValues>(sampleTemplateVariables);

  // Step 2
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [audienceTab, setAudienceTab] = useState<"folders" | "contacts">("folders");

  // CSV Import state
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [nameColumn, setNameColumn] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [companyColumn, setCompanyColumn] = useState(NO_COMPANY_COLUMN);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
    queryFn: () => api.templates.list(),
    enabled: !!user,
  });

  useEffect(() => {
    const templateId = searchParams.get("templateId");
    if (templateId && templates.length > 0 && !selectedTemplate) {
      const found = templates.find((t) => t.id === templateId);
      if (found) {
        setSelectedTemplate(found);
        setDesignConfig(toVisualConfig(found));
        setSubject(found.subject || "");
        setPreviewText(found.preview_text || "");
      }
    }
  }, [searchParams, templates, selectedTemplate]);

  const savedEmailTemplates = useMemo(
    () =>
      templates.filter((t) => {
        if (!isEmailContent(t)) return false;
        const presetId = (t.design_config as VisualTemplateConfig | null)?.presetId;
        if (!presetId) return true;
        return !visualTemplatePresets.some((p) => p.id === presetId);
      }),
    [templates],
  );

  const presetStarters = useMemo(
    () => visualTemplatePresets.map((preset) => ({ preset, starter: getStarterTemplate(preset.id) })),
    [],
  );

  const [pickingPresetId, setPickingPresetId] = useState<VisualTemplatePresetId | null>(null);

  const { data: existingCampaigns = [] } = useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: () => api.campaigns.list(),
    enabled: !!user,
  });

  const trimmedCampaignName = campaignName.trim();

  const { data: folders = [] } = useQuery({
    queryKey: ["wizard-folders", user?.id],
    queryFn: () => api.contacts.folders.list(),
    enabled: !!user,
  });

  const { data: folderMembers = [] } = useQuery({
    queryKey: ["wizard-folder-members", user?.id],
    queryFn: () => api.contacts.folderMembers.list(),
    enabled: !!user,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["wizard-contacts", user?.id],
    queryFn: async () => {
      const all = await api.contacts.list();
      return (all || []).filter((c: any) => c.status === 'Active' || c.status === 'active');
    },
    enabled: !!user,
  });

  const { data: smtp } = useQuery({
    queryKey: ["wizard-smtp", user?.id],
    queryFn: () => api.settings.smtp.get(),
    enabled: !!user,
  });

  useEffect(() => {
    if (smtp && !senderEmail) {
      setSenderEmail(smtp.from_email || smtp.username || "");
      setSenderName(smtp.from_name || "");
    }
  }, [smtp]); // eslint-disable-line

  /* ----------------- CSV Import helpers ----------------- */
  const resetCsvImport = () => {
    setCsvFile(null);
    setCsvPreview([]);
    setCsvHeaders([]);
    setNameColumn("");
    setEmailColumn("");
    setCompanyColumn(NO_COMPANY_COLUMN);
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const detectColumns = (headers: string[]) => {
    const lower = headers.map((h) => h.toLowerCase().trim());
    const find = (keywords: string[]) => {
      for (const kw of keywords) {
        const idx = lower.findIndex((h) => h.includes(kw));
        if (idx >= 0) return headers[idx];
      }
      return "";
    };
    setNameColumn(find(["name", "full name", "fullname", "first name", "last name"]));
    setEmailColumn(find(["email", "e-mail", "email address", "mail"]));
    setCompanyColumn(find(["company", "organization", "org", "business", "company_name", "company name"]) || NO_COMPANY_COLUMN);
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    try {
      const rows = await readSpreadsheetRows(file);

      if (rows.length === 0) { toast.error("No data found in file"); setIsParsing(false); return; }

      const headers = normalizeCsvHeaders(rows[0].map((h) => String(h)));
      const previewRows = rows.slice(1, 6).map((r) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = String(r[i] || "").trim(); });
        return obj;
      });

      setCsvHeaders(headers);
      setCsvPreview(previewRows);
      detectColumns(headers);
    } catch (e: any) {
      toast.error(e.message || "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const importCsvMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!emailColumn) throw new Error("Please map the Email column");

      const rows = await readSpreadsheetRows(csvFile!);
      const headers = normalizeCsvHeaders(rows[0].map((h) => String(h)));

      const headerIdx: Record<string, number> = {};
      headers.forEach((h, i) => { headerIdx[h] = i; });

      const nameIdx = headerIdx[nameColumn];
      const emailIdx = headerIdx[emailColumn];
      const companyIdx = companyColumn && companyColumn !== NO_COMPANY_COLUMN ? headerIdx[companyColumn] : -1;

      const importRows = rows
        .slice(1)
        .map((r) => {
          const email = emailIdx >= 0 ? String(r[emailIdx] || "").trim() : "";
          const name = nameIdx >= 0 ? String(r[nameIdx] || "").trim() : "";
          const company = companyIdx >= 0 ? String(r[companyIdx] || "").trim() || null : null;
          return { user_id: user.id, name, email, company_name: company, status: "Active" as const };
        })
        .filter((r) => r.email);

      if (importRows.length === 0) throw new Error("No valid contacts found");

      const importedContacts = await api.contacts.bulkCreate(
        importRows.map(r => ({ ...r, user_id: user.id }))
      );
      return importedContacts;
    },
    onSuccess: (importedContacts: { id: string }[]) => {
      const newIds = importedContacts.map((c) => c.id);
      queryClient.invalidateQueries({ queryKey: ["wizard-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      // Auto-select newly imported contacts
      setSelectedContactIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
      setCsvImportOpen(false);
      resetCsvImport();
      toast.success(`Imported ${newIds.length} contacts and added to selection!`);
      setAudienceTab("contacts");
    },
    onError: (err: any) => toast.error(err.message || "Import failed"),
  });

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
  const initEditorFromTemplate = (t: EmailRow) => {
    setDesignConfig(toVisualConfig(t));
  };

  const startEditing = (t: EmailRow) => {
    setSelectedTemplate(t);
    initEditorFromTemplate(t);
    if (!subject) setSubject(t.subject);
    if (!campaignName) setCampaignName(t.name);
    setEditing(true);
  };

  const pickTemplate = (t: EmailRow) => {
    setSelectedTemplate(t);
    initEditorFromTemplate(t);
    if (!subject) setSubject(t.subject);
    if (!campaignName) setCampaignName(t.name);
    setEditing(true);
  };

  const replaceVisualConfig = (nextConfig: VisualTemplateConfig) => {
    setDesignConfig(nextConfig);
  };

  const updateVisualConfig = <K extends keyof VisualTemplateConfig>(key: K, value: VisualTemplateConfig[K]) => {
    setDesignConfig((current) => {
      const base =
        current || (getStarterTemplate("lead-magnet").design_config as VisualTemplateConfig);
      const nextConfig = { ...base, [key]: value } as VisualTemplateConfig;

      if (
        key === "brandName" &&
        typeof value === "string" &&
        base.footerNote.includes(base.brandName)
      ) {
        nextConfig.footerNote = base.footerNote.split(base.brandName).join(value);
      }

      if (!nextConfig.sectionOrder?.length) {
        nextConfig.sectionOrder = DEFAULT_VISUAL_SECTION_ORDER;
      }

      return nextConfig;
    });
  };

  const pickPreset = async (presetId: VisualTemplatePresetId) => {
    if (!user) return;
    setPickingPresetId(presetId);
    try {
      const existing = templates.find(
        (t) =>
          isEmailContent(t) &&
          (t.design_config as VisualTemplateConfig | null)?.presetId === presetId,
      );
      if (existing) {
        pickTemplate(existing);
        return;
      }

      const starter = getStarterTemplate(presetId);
      const created = await api.templates.create({
        name: starter.name,
        subject: starter.subject,
        body: starter.body,
        type: starter.type,
        category: "general",
        template_format: "visual",
        html_body: starter.html_body,
        design_config: {
          ...(starter.design_config as VisualTemplateConfig),
          sectionOrder: DEFAULT_VISUAL_SECTION_ORDER,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["wizard-templates", user.id] });
      pickTemplate(created as EmailRow);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load template");
    } finally {
      setPickingPresetId(null);
    }
  };

  const resolveCampaignName = () => {
    const base = trimmedCampaignName || selectedTemplate?.name || "Email campaign";
    if (!isCampaignNameTaken(base, existingCampaigns)) return base;
    return `${base} — ${format(new Date(), "MMM d, yyyy h:mm a")}`;
  };

  const renderedHtml = useMemo(() => {
    if (designConfig) return buildVisualTemplateContent(designConfig).htmlBody;
    return selectedTemplate?.html_body || "";
  }, [designConfig, selectedTemplate]);

  const renderedPlain = useMemo(() => {
    if (designConfig) return buildVisualTemplateContent(designConfig).body;
    return selectedTemplate?.body || "";
  }, [designConfig, selectedTemplate]);

  /* ----------------- Send ----------------- */
  const sendCampaign = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!selectedTemplate) throw new Error("Pick a template");
      if (recipientIds.length === 0) throw new Error("Select at least one recipient");
      const name = resolveCampaignName();

      const freshSmtp = await queryClient.fetchQuery({
        queryKey: ["wizard-smtp", user.id],
        queryFn: () => api.settings.smtp.get(),
      });

      if (freshSmtp?.id && (senderName || senderEmail)) {
        await api.settings.smtp.save({
          from_name: senderName || freshSmtp.from_name,
          from_email: senderEmail || freshSmtp.from_email,
        });
      }
      if (!subject) throw new Error("Subject required");

      const smtpForSend = await queryClient.fetchQuery({
        queryKey: ["wizard-smtp", user.id],
        queryFn: () => api.settings.smtp.get(),
      });
      if (!hasUsableSmtpConfig(smtpForSend)) throw new Error(getSmtpConfigError());

      let scheduledAt = new Date();
      if (sendMode === "later") {
        if (!scheduleDate) throw new Error("Pick a date");
        const [h, m] = scheduleTime.split(":").map(Number);
        scheduledAt = new Date(scheduleDate);
        scheduledAt.setHours(h || 9, m || 0, 0, 0);
        if (scheduledAt.getTime() < Date.now()) throw new Error("Schedule must be in the future");
      }

      // Persist edited template
      const visualConfig = designConfig || toVisualConfig(selectedTemplate);
      const visualContent = buildVisualTemplateContent(visualConfig);

      let finalHtml = visualContent.htmlBody;
      if (previewText.trim()) {
        const preheaderDiv = `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden">${previewText.trim()}</div>`;
        finalHtml = preheaderDiv + finalHtml;
      }

      await api.templates.update(selectedTemplate.id, {
        subject,
        preview_text: previewText.trim(),
        body: visualContent.body,
        html_body: finalHtml,
        blocks: null,
        design_config: visualConfig,
        template_format: "visual",
      });

      // Create campaign
      const campaign = await api.campaigns.create({
        name,
        status: sendMode === "now" ? "Running" : "Scheduled",
      });

      // Single step pointing to template
      await api.campaigns.steps.create(campaign.id, {
        step_number: 1,
        delay_value: 0,
        delay_unit: "days",
        delay_days: 0,
        template_id: selectedTemplate.id,
        subject_a: subject,
        preview_text_a: previewText.trim(),
      });

      // Tag recipient contacts to this campaign
      await api.contacts.bulkUpdate(recipientIds, { campaign_id: campaign.id });

      // Queue rows
      const queueRows = recipientIds.map((cid) => ({
        campaign_id: campaign.id,
        contact_id: cid,
        step_number: 1,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending" as const,
      }));
      // Insert in chunks
      for (let i = 0; i < queueRows.length; i += 500) {
        const chunk = queueRows.slice(i, i + 500);
        await api.queue.bulkCreate(chunk);
      }

      let continuedInBackground = false;
      let failed = 0;

      // Trigger processor immediately if sending now, but don't block the UI indefinitely.
      if (sendMode === "now") {
        const queueProcessor = await startQueueProcessor(campaign.id);
        continuedInBackground = queueProcessor.continuedInBackground;
        failed = queueProcessor.failed;
      }

      return {
        campaignId: campaign.id,
        scheduledAt: sendMode === "later" ? scheduledAt : null,
        continuedInBackground,
        failed,
      };
    },
    onSuccess: ({ campaignId, scheduledAt, continuedInBackground, failed }) => {
      setCreatedCampaignId(campaignId);
      setSuccessMeta({ recipients: recipientIds.length, scheduledAt });
      setSuccessOpen(true);
      if (continuedInBackground) {
        toast.success("Campaign started. Delivery is continuing in the background.");
      } else if (failed > 0) {
        toast.error(`${failed} email${failed === 1 ? "" : "s"} failed to send. Check Email Queue for the error details.`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ----------------- Step nav ----------------- */
  const canContinue = () => {
    if (step === 1) return false;
    if (step === 2) return !!senderName.trim() && !!senderEmail.trim() && senderEmail.includes("@");
    if (step === 3) return !!subject.trim();
    if (step === 4) return recipientIds.length > 0;
    if (step === 5) return sendMode === "now" || !!scheduleDate;
    return false;
  };

  const next = () => {
    if (!canContinue()) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    else sendCampaign.mutate();
  };

  const stepContentWidth =
    step === 1 && !editing
      ? "max-w-6xl"
      : step === 1 && editing
        ? "max-w-6xl"
        : step === 2
          ? "max-w-xl"
          : step === 3
            ? "max-w-4xl"
            : step === 4
              ? "max-w-4xl"
              : "max-w-3xl";

  const wizardFooter = step > 1 && (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
      <Button
        variant="ghost"
        disabled={step === 1}
        onClick={() => {
          if (step === 2 && selectedTemplate) {
            setEditing(true);
          }
          setStep(step - 1);
        }}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="text-sm text-muted-foreground">
        Step {step} of {TOTAL_STEPS}
      </div>
      <Button onClick={next} disabled={!canContinue() || sendCampaign.isPending} className="rounded-full">
        {step < TOTAL_STEPS ? (
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
  );

  /* ----------------- Render ----------------- */
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Exit
        </Button>
        <div className="min-w-0 flex-1 px-2 sm:px-4">
          <StepIndicator current={step} steps={STEPS} onJump={setStep} />
        </div>
        <div className="hidden w-[72px] shrink-0 sm:block" aria-hidden />
      </div>

      <div className={cn("relative mx-auto w-full", stepContentWidth)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={editing ? "edit" : step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && !editing && (
              <Step1Picker
                presets={presetStarters}
                savedTemplates={savedEmailTemplates}
                loading={tLoad}
                selectedTemplate={selectedTemplate}
                pickingPresetId={pickingPresetId}
                onPick={pickTemplate}
                onPickPreset={pickPreset}
                onEdit={startEditing}
              />
            )}

            {step === 1 && editing && selectedTemplate && designConfig && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Customize template
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Add sections on the left, then edit on the preview.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    Back to gallery
                  </Button>
                </div>

                <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:max-w-md">
                  <div className="space-y-2">
                    <Label className="text-xs">Preview as (first name)</Label>
                    <Input
                      value={previewVariables.FirstName}
                      onChange={(e) =>
                        setPreviewVariables((prev) => ({ ...prev, FirstName: e.target.value }))
                      }
                      placeholder="Ava"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Preview company</Label>
                    <Input
                      value={previewVariables.CompanyName}
                      onChange={(e) =>
                        setPreviewVariables((prev) => ({ ...prev, CompanyName: e.target.value }))
                      }
                      placeholder="Northstar"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <VisualTemplateCanvas
                    config={designConfig}
                    variables={previewVariables}
                    onConfigChange={replaceVisualConfig}
                    onUpdateField={updateVisualConfig}
                    layout="sidebar"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <Step2From
                senderName={senderName}
                onSenderName={setSenderName}
                senderEmail={senderEmail}
                onSenderEmail={setSenderEmail}
              />
            )}

            {step === 3 && (
              <Step3Subject
                subject={subject}
                onSubject={setSubject}
                previewText={previewText}
                onPreviewText={setPreviewText}
                senderName={senderName}
                senderEmail={senderEmail}
                renderedHtml={renderedHtml}
                renderedBody={renderedPlain}
              />
            )}

            {step === 4 && (
              <Step4Audience
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
                onImportCsv={() => setCsvImportOpen(true)}
              />
            )}

            {step === 5 && (
              <Step5Schedule
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
                  campaignName: resolveCampaignName(),
                  senderName,
                  senderEmail,
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {wizardFooter}
      </div>

      {step === 1 && editing && selectedTemplate && (
        <div className="mx-auto mt-6 flex w-full max-w-3xl items-center justify-end gap-3 border-t border-border pt-4">
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
        campaignName={resolveCampaignName()}
        recipients={successMeta.recipients}
        scheduledAt={successMeta.scheduledAt}
        onViewAnalytics={() => createdCampaignId && navigate(`/campaigns/${createdCampaignId}/report`)}
        onBackToDashboard={() => navigate("/dashboard")}
      />

      {/* CSV Import Dialog */}
      <Dialog open={csvImportOpen} onOpenChange={(open) => { setCsvImportOpen(open); if (!open) resetCsvImport(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Import Contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with your contacts. We'll detect columns automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* File upload */}
            {!csvFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) { setCsvFile(f); parseFile(f); }
                }}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center transition-colors hover:bg-muted/50"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">Click or drag & drop a CSV / Excel file</p>
                <p className="mt-1 text-xs text-muted-foreground">Supports .csv, .xlsx, .xls</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setCsvFile(f); parseFile(f); }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{csvFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(csvFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetCsvImport}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Column mapping */}
            {csvHeaders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-sm font-medium text-foreground">Map columns</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name column</Label>
                    <Select
                      value={nameColumn || UNMAPPED_COLUMN}
                      onValueChange={(v) => setNameColumn(v === UNMAPPED_COLUMN ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMAPPED_COLUMN}>Select column</SelectItem>
                        {csvHeaders.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Email column <span className="text-destructive">*</span></Label>
                    <Select
                      value={emailColumn || UNMAPPED_COLUMN}
                      onValueChange={(v) => setEmailColumn(v === UNMAPPED_COLUMN ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMAPPED_COLUMN}>Select column</SelectItem>
                        {csvHeaders.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Company column <span className="text-muted-foreground">(optional)</span></Label>
                    <Select value={companyColumn} onValueChange={setCompanyColumn}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_COMPANY_COLUMN}>None</SelectItem>
                        {csvHeaders.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Preview */}
                {csvPreview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview (first 5 rows)</p>
                    <div className="max-h-[200px] overflow-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            {nameColumn && <th className="px-3 py-2 text-left font-medium">Name</th>}
                            {emailColumn && <th className="px-3 py-2 text-left font-medium">Email</th>}
                            {companyColumn !== NO_COMPANY_COLUMN && (
                              <th className="px-3 py-2 text-left font-medium">Company</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {csvPreview.map((row, i) => (
                            <tr key={i}>
                              {nameColumn && <td className="px-3 py-2">{row[nameColumn] || "—"}</td>}
                              {emailColumn && <td className="px-3 py-2">{row[emailColumn] || "—"}</td>}
                              {companyColumn !== NO_COMPANY_COLUMN && (
                                <td className="px-3 py-2">{row[companyColumn] || "—"}</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setCsvImportOpen(false); resetCsvImport(); }}>
                Cancel
              </Button>
              <Button
                onClick={() => importCsvMutation.mutate()}
                disabled={!emailColumn || !csvFile || importCsvMutation.isPending || isParsing}
                className="rounded-full"
              >
                {importCsvMutation.isPending ? "Importing..." : "Import & Select"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* =================== STEP 1 =================== */
const TemplateCard = ({
  title,
  subject,
  html,
  body,
  selected,
  busy,
  onEdit,
  onChoose,
}: {
  title: string;
  subject: string;
  html: string | null;
  body: string;
  selected: boolean;
  busy?: boolean;
  onEdit?: () => void;
  onChoose: () => void;
}) => (
  <div
    className={cn(
      "group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
      selected ? "border-primary ring-2 ring-primary/30" : "border-border",
    )}
  >
    <div className="relative h-56 overflow-hidden bg-muted/30">
      <TemplatePreview html={html} body={body} scaled className="h-full w-full !rounded-none border-0" />
      {selected && (
        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
    <div className="space-y-3 p-5">
      <div>
        <h3 className="truncate font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{replaceTemplateVariables(subject)}</p>
      </div>
      <div className="flex gap-2">
        {onEdit && (
          <Button onClick={onEdit} variant="outline" size="sm" className="flex-1 rounded-full" disabled={busy}>
            <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        )}
        <Button onClick={onChoose} size="sm" className="flex-1 rounded-full" disabled={busy}>
          {busy ? "Loading..." : "Choose & edit"}
        </Button>
      </div>
    </div>
  </div>
);

const Step1Picker = ({
  presets,
  savedTemplates,
  loading,
  selectedTemplate,
  pickingPresetId,
  onPick,
  onPickPreset,
  onEdit,
}: {
  presets: { preset: (typeof visualTemplatePresets)[number]; starter: ReturnType<typeof getStarterTemplate> }[];
  savedTemplates: EmailRow[];
  loading: boolean;
  selectedTemplate: EmailRow | null;
  pickingPresetId: VisualTemplatePresetId | null;
  onPick: (t: EmailRow) => void;
  onPickPreset: (id: VisualTemplatePresetId) => void;
  onEdit: (t: EmailRow) => void;
}) => {
  const selectedPresetId = (selectedTemplate?.design_config as VisualTemplateConfig | null)?.presetId;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Choose your template</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a prebuilt design or one you saved. You can customize before sending.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">Prebuilt designs</h3>
        </div>
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map(({ preset, starter }, i) => {
              const selected = selectedPresetId === preset.id;
              const busy = pickingPresetId === preset.id;
              return (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <TemplateCard
                    title={preset.name}
                    subject={starter.subject}
                    html={starter.html_body}
                    body={starter.body}
                    selected={selected}
                    busy={busy}
                    onChoose={() => onPickPreset(preset.id)}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && savedTemplates.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Your saved emails</h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {savedTemplates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <TemplateCard
                  title={t.name}
                  subject={t.subject}
                  html={t.html_body}
                  body={t.body}
                  selected={selectedTemplate?.id === t.id}
                  onEdit={() => onEdit(t)}
                  onChoose={() => onPick(t)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!loading && savedTemplates.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Custom templates you create under Emails will appear here too.
        </p>
      )}
    </div>
  );
};

/* =================== STEP 2 — FROM =================== */
const Step2From = ({
  senderName,
  onSenderName,
  senderEmail,
  onSenderEmail,
}: {
  senderName: string;
  onSenderName: (v: string) => void;
  senderEmail: string;
  onSenderEmail: (v: string) => void;
}) => (
  <div className="space-y-5">
    <div className="space-y-1">
      <h2 className="font-display text-2xl font-bold text-foreground">Who is this email from?</h2>
      <p className="text-sm text-muted-foreground">
        Recipients will see this name and address in their inbox.
      </p>
    </div>
    <Card className="space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <Label>Sender name</Label>
        <Input
          value={senderName}
          onChange={(e) => onSenderName(e.target.value)}
          placeholder="Ava Studio"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>Sender email</Label>
        <Input
          type="email"
          value={senderEmail}
          onChange={(e) => onSenderEmail(e.target.value)}
          placeholder="hello@yourcompany.com"
        />
        <p className="text-xs text-muted-foreground">
          Must match your connected sending account in Settings.
        </p>
      </div>
    </Card>
  </div>
);

/* =================== STEP 3 — SUBJECT =================== */
const Step3Subject = ({
  subject,
  onSubject,
  previewText,
  onPreviewText,
  senderName,
  senderEmail,
  renderedHtml,
  renderedBody,
}: {
  subject: string;
  onSubject: (v: string) => void;
  previewText: string;
  onPreviewText: (v: string) => void;
  senderName: string;
  senderEmail: string;
  renderedHtml: string;
  renderedBody: string;
}) => {
  const aiSubject = useMutation({
    mutationFn: async () => {
      const data = await api.ai.writeEmail({
        prompt: `Suggest a short, catchy email subject line for: ${subject || "marketing email"}`,
        type: "subject",
      });
      if (data && typeof data === "object" && "success" in data && data.success === false) {
        throw new Error(typeof data.error === "string" ? data.error : "AI suggestion failed");
      }
      const content = (data as { content?: string })?.content || "";
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const subjects = JSON.parse(cleaned);
        if (Array.isArray(subjects) && subjects.length > 0) return String(subjects[0]);
      } catch {
        // use raw text
      }
      return content.split("\n")[0] || "";
    },
    onSuccess: (s: string) => {
      if (s) onSubject(s.slice(0, 120));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "AI suggestion failed");
    },
  });

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-foreground">What&apos;s your subject line?</h2>
        <p className="text-sm text-muted-foreground">
          This is the first thing people see in their inbox.
        </p>
      </div>

      <Card className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Subject line</Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 px-2 text-xs"
              disabled={aiSubject.isPending}
              onClick={() => aiSubject.mutate()}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {aiSubject.isPending ? "Thinking..." : "AI suggest"}
            </Button>
          </div>
          <Input
            value={subject}
            onChange={(e) => onSubject(e.target.value)}
            placeholder="{{FirstName}}, your free guide is ready"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">{subject.length}/100 characters</p>
        </div>

        <div className="space-y-2">
          <Label>Preview text <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea
            value={previewText}
            onChange={(e) => onPreviewText(e.target.value)}
            rows={2}
            placeholder="Short teaser shown under the subject in the inbox"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/30 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Inbox preview</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {senderName || "Sender"}{" "}
            <span className="font-normal text-muted-foreground">
              &lt;{senderEmail || "you@example.com"}&gt;
            </span>
          </p>
          <p className="mt-1 truncate text-base font-bold text-foreground">
            {subject || "Your subject line"}
          </p>
          {previewText && <p className="mt-1 truncate text-xs text-muted-foreground">{previewText}</p>}
        </div>
        <div className="max-h-[280px] overflow-y-auto bg-white">
          {renderedHtml ? (
            <div dangerouslySetInnerHTML={{ __html: replaceTemplateVariables(renderedHtml) }} />
          ) : (
            <div className="whitespace-pre-wrap p-6 text-sm text-muted-foreground">{renderedBody}</div>
          )}
        </div>
      </Card>
    </div>
  );
};

/* =================== STEP 4 — AUDIENCE =================== */
const Step4Audience = ({
  folders, folderMembers, contacts,
  selectedFolderIds, selectedContactIds,
  onToggleFolder, onToggleContact, onSelectAllVisible, onClearAll,
  search, onSearchChange, tab, onTabChange, recipientCount,
  onImportCsv,
}: {
  folders: FolderRow[]; folderMembers: any[]; contacts: ContactRow[];
  selectedFolderIds: Set<string>; selectedContactIds: Set<string>;
  onToggleFolder: (id: string) => void; onToggleContact: (id: string) => void;
  onSelectAllVisible: (ids: string[]) => void; onClearAll: () => void;
  search: string; onSearchChange: (s: string) => void;
  tab: "folders" | "contacts"; onTabChange: (t: "folders" | "contacts") => void;
  recipientCount: number;
  onImportCsv: () => void;
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold text-foreground">Who do you want to send to?</h2>
          <p className="text-sm text-muted-foreground">
            Pick lists, contacts, or import a CSV file.
          </p>
        </div>
        <motion.div
          initial={false}
          animate={{ scale: recipientCount > 0 ? 1 : 0.95 }}
          className="flex shrink-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2"
        >
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {recipientCount.toLocaleString()} recipient{recipientCount === 1 ? "" : "s"}
          </span>
        </motion.div>
      </div>

      <Card className="p-4 sm:p-5">
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
            <Button variant="outline" size="sm" onClick={onImportCsv} className="rounded-full">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
            </Button>
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
            <div className="max-h-[min(360px,50vh)] divide-y divide-border overflow-y-auto">
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
      </Card>
    </div>
  );
};

/* =================== STEP 5 — SEND =================== */
const Step5Schedule = ({
  sendMode, onSendMode, scheduleDate, onScheduleDate, scheduleTime, onScheduleTime,
  timezone, onTimezone, summary,
}: {
  sendMode: "now" | "later"; onSendMode: (m: "now" | "later") => void;
  scheduleDate: Date | undefined; onScheduleDate: (d: Date | undefined) => void;
  scheduleTime: string; onScheduleTime: (t: string) => void;
  timezone: string; onTimezone: (t: string) => void;
  summary: {
    templateName: string;
    recipients: number;
    subject: string;
    campaignName: string;
    senderName: string;
    senderEmail: string;
  };
}) => (
  <div className="space-y-5">
    <div className="space-y-1">
      <h2 className="font-display text-2xl font-bold text-foreground">When should we send?</h2>
      <p className="text-sm text-muted-foreground">Send right away or pick a future time.</p>
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
        <SummaryRow label="From" value={`${summary.senderName} <${summary.senderEmail}>`} />
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
