import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Copy, Trash2, Eye, Edit3, Sparkles, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TemplatePreview from "@/components/TemplatePreview";
import BlockEditor from "@/components/BlockEditor";
import AIEmailWriter from "@/components/AIEmailWriter";
import VisualTemplateCanvas from "@/components/VisualTemplateCanvas";
import { DEFAULT_VISUAL_SECTION_ORDER } from "@/lib/visual-template-sections";
import {
  buildVisualTemplateContent,
  getStarterTemplate,
  replaceTemplateVariables,
  sampleTemplateVariables,
  type TemplateFormat,
  type TemplateVariableValues,
  type VisualTemplateConfig,
  type VisualTemplatePresetId,
  visualTemplatePresets,
} from "@/lib/template-presets";
import {
  createEmptyDocument,
  isTemplateDocument,
  renderDocumentHtml,
  renderDocumentPlain,
  wrapLegacyAsDocument,
  type TemplateDocument,
} from "@/lib/template-blocks";
import { FORM_CATEGORY } from "@/lib/content-types";

const variables = ["{{FirstName}}", "{{Email}}", "{{CompanyName}}"];
const typeColors: Record<string, string> = {
  Initial: "bg-primary/10 text-primary",
  "Follow-up 1": "bg-info/10 text-info",
  "Follow-up 2": "bg-warning/10 text-warning",
  "Follow-up 3": "bg-destructive/10 text-destructive",
  Final: "bg-muted text-muted-foreground",
};

type EmailTemplateRow = Database["public"]["Tables"]["email_templates"]["Row"];

type TemplateFormState = {
  name: string;
  subject: string;
  preview_text: string;
  body: string;
  type: string;
  category: string;
  template_format: TemplateFormat | "blocks";
  html_body: string | null;
  design_config: VisualTemplateConfig | null;
  blocks: TemplateDocument | null;
};

const createEmptyForm = (category = "general"): TemplateFormState => ({
  name: "",
  subject: "",
  preview_text: "",
  body: "",
  type: "Initial",
  category,
  template_format: "plain",
  html_body: null,
  design_config: null,
  blocks: null,
});

const isVisualTemplateConfig = (value: unknown): value is VisualTemplateConfig => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { presetId?: unknown }).presetId === "string";
};

const toFormState = (template: EmailTemplateRow): TemplateFormState => {
  const rawFormat = template.template_format;
  const templateFormat: TemplateFormState["template_format"] =
    rawFormat === "blocks" ? "blocks" : rawFormat === "visual" ? "visual" : "plain";
  const fallbackStarter = getStarterTemplate("lead-magnet");
  const visualConfig = isVisualTemplateConfig(template.design_config)
    ? template.design_config
    : templateFormat === "visual"
      ? {
          ...(fallbackStarter.design_config as VisualTemplateConfig),
          headline: template.name,
          body: template.body,
        }
      : null;
  const blocksDoc = isTemplateDocument(template.blocks) ? (template.blocks as TemplateDocument) : null;

  return {
    name: template.name,
    subject: template.subject || "",
    preview_text: (template as any).preview_text || "",
    body: template.body || "",
    type: template.type,
    category: template.category,
    template_format: templateFormat,
    html_body: template.html_body,
    design_config: visualConfig,
    blocks: blocksDoc,
  };
};

const Templates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRow | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateRow | null>(null);
  const [form, setForm] = useState<TemplateFormState>(createEmptyForm());
  const [previewVariables, setPreviewVariables] = useState<TemplateVariableValues>(sampleTemplateVariables);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplateRow[];
    },
    enabled: !!user,
  });

  // Deep-link support from /emails: ?edit=<id> opens edit dialog, ?new=1 opens create dialog
  useEffect(() => {
    const editId = searchParams.get("edit");
    const isNew = searchParams.get("new");
    const categoryParam = searchParams.get("category");
    if (isNew) {
      setForm(createEmptyForm(categoryParam === "form" ? FORM_CATEGORY : "general"));
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      next.delete("category");
      setSearchParams(next, { replace: true });
      return;
    }
    if (editId && templates.length > 0) {
      const found = templates.find((t) => t.id === editId);
      if (found) {
        setSelectedTemplate(found);
        setForm(toFormState(found));
        setEditOpen(true);
        const next = new URLSearchParams(searchParams);
        next.delete("edit");
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, templates, setSearchParams]);

  const starterTemplates = useMemo(
    () => visualTemplatePresets.map((preset) => ({ preset, starter: getStarterTemplate(preset.id) })),
    [],
  );

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_templates").insert({
        user_id: user!.id,
        name: form.name,
        subject: form.subject,
        preview_text: form.preview_text,
        body: form.body,
        type: form.type,
        category: form.category,
        template_format: form.template_format,
        html_body: form.html_body,
        design_config: form.design_config,
        ...(form.blocks ? { blocks: form.blocks } : {}),
      } as Database["public"]["Tables"]["email_templates"]["Insert"]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      setCreateOpen(false);
      
      const wasForm = form.category === FORM_CATEGORY;
      setForm(createEmptyForm());
      toast.success(wasForm ? "Form created!" : "Template created!");
      
      if (wasForm) {
        navigate("/forms");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("No template selected");
      const { error } = await supabase
        .from("email_templates")
        .update({
          name: form.name,
          subject: form.subject,
          preview_text: form.preview_text,
          body: form.body,
          type: form.type,
          category: form.category,
          template_format: form.template_format,
          html_body: form.html_body,
          design_config: form.design_config,
          ...(form.blocks ? { blocks: form.blocks } : { blocks: null }),
        } as Database["public"]["Tables"]["email_templates"]["Update"])
        .eq("id", selectedTemplate.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      setEditOpen(false);
      setSelectedTemplate(null);
      toast.success("Template updated!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: EmailTemplateRow) => {
      const { error } = await supabase.from("email_templates").insert({
        user_id: user!.id,
        name: `${template.name} (Copy)`,
        subject: template.subject,
        preview_text: (template as any).preview_text || "",
        body: template.body,
        type: template.type,
        template_format: template.template_format,
        html_body: template.html_body,
        design_config: template.design_config,
        ...((template as unknown as { blocks?: unknown }).blocks
          ? { blocks: (template as unknown as { blocks?: unknown }).blocks }
          : {}),
      } as Database["public"]["Tables"]["email_templates"]["Insert"]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      toast.success("Template duplicated!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      toast.success("Template deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreateWithStarter = (presetId: VisualTemplatePresetId) => {
    setForm({ ...createEmptyForm(), ...getStarterTemplate(presetId), blocks: null });
    setCreateOpen(true);
  };

  const openEditTemplate = (template: EmailTemplateRow) => {
    setSelectedTemplate(template);
    setForm(toFormState(template));
    setEditOpen(true);
  };

  const insertVariable = (variable: string) => {
    setForm((prev) => ({ ...prev, body: `${prev.body}${variable}` }));
  };

  const applyVisualPreset = (presetId: VisualTemplatePresetId) => {
    const starter = getStarterTemplate(presetId);

    setForm((prev) => ({
      ...prev,
      name: prev.name || starter.name,
      subject: prev.subject || starter.subject,
      type: prev.type || starter.type,
      template_format: "visual",
      body: starter.body,
      html_body: starter.html_body,
      design_config: {
        ...(starter.design_config as VisualTemplateConfig),
        sectionOrder: DEFAULT_VISUAL_SECTION_ORDER,
      },
      blocks: null,
    }));
  };

  const replaceVisualConfig = (nextConfig: VisualTemplateConfig) => {
    const visualContent = buildVisualTemplateContent(nextConfig);
    setForm((prev) => ({
      ...prev,
      template_format: "visual",
      design_config: nextConfig,
      body: visualContent.body,
      html_body: visualContent.htmlBody,
    }));
  };

  const updateVisualConfig = <K extends keyof VisualTemplateConfig>(key: K, value: VisualTemplateConfig[K]) => {
    setForm((prev) => {
      const currentConfig =
        prev.design_config || (getStarterTemplate("lead-magnet").design_config as VisualTemplateConfig);
      const nextConfig = { ...currentConfig, [key]: value } as VisualTemplateConfig;

      if (
        key === "brandName" &&
        typeof value === "string" &&
        currentConfig.footerNote.includes(currentConfig.brandName)
      ) {
        nextConfig.footerNote = currentConfig.footerNote.split(currentConfig.brandName).join(value);
      }

      if (!nextConfig.sectionOrder?.length) {
        nextConfig.sectionOrder = DEFAULT_VISUAL_SECTION_ORDER;
      }

      const visualContent = buildVisualTemplateContent(nextConfig);

      return {
        ...prev,
        template_format: "visual",
        design_config: nextConfig,
        body: visualContent.body,
        html_body: visualContent.htmlBody,
      };
    });
  };

  const changeFormat = (format: TemplateFormState["template_format"]) => {
    if (format === "blocks") {
      setForm((prev) => {
        const doc = prev.blocks ?? (prev.body ? wrapLegacyAsDocument(prev.body) : createEmptyDocument());
        const html = renderDocumentHtml(doc);
        const plain = renderDocumentPlain(doc);
        return {
          ...prev,
          template_format: "blocks",
          blocks: doc,
          html_body: html,
          body: plain || prev.body,
          design_config: null,
        };
      });
      return;
    }
    if (format === "visual") {
      applyVisualPreset(form.design_config?.presetId || "lead-magnet");
      return;
    }

    setForm((prev) => ({
      ...prev,
      template_format: "plain",
      html_body: null,
      design_config: null,
      blocks: null,
    }));
  };

  const updateBlocksDoc = (doc: TemplateDocument) => {
    setForm((prev) => ({
      ...prev,
      template_format: "blocks",
      blocks: doc,
      html_body: renderDocumentHtml(doc),
      body: renderDocumentPlain(doc),
      design_config: null,
    }));
  };

  const isCanvasEditor = form.template_format === "visual" || form.template_format === "blocks";

  const renderEditor = (onSubmit: () => void, submitLabel: string, isPending: boolean) => (
    <div className={isCanvasEditor ? "space-y-5" : "grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                const newName = e.target.value;
                setForm((prev) => ({ 
                  ...prev, 
                  name: newName,
                  // Auto-fill subject for forms since the field is hidden
                  subject: prev.category === FORM_CATEGORY ? newName : prev.subject
                }));
              }}
              placeholder={form.category === FORM_CATEGORY ? "Newsletter Signup Form" : "Lead Magnet Download"}
            />
          </div>
          {form.category !== FORM_CATEGORY && (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Initial", "Follow-up 1", "Follow-up 2", "Follow-up 3", "Final"].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {form.category !== FORM_CATEGORY && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Your resource for {{CompanyName}} is ready"
              />
            </div>
            <div className="space-y-2">
              <Label>Preview Text (Optional)</Label>
              <Input
                value={form.preview_text}
                onChange={(e) => setForm((prev) => ({ ...prev, preview_text: e.target.value }))}
                placeholder="A short summary of what's inside..."
              />
            </div>
          </div>
        )}

        <Tabs
          value={form.template_format}
          onValueChange={(value) => changeFormat(value as TemplateFormState["template_format"])}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plain">Plain</TabsTrigger>
            <TabsTrigger value="visual">Visual Preset</TabsTrigger>
            <TabsTrigger value="blocks">Block Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="blocks" className="space-y-4">
            {form.blocks ? (
              <BlockEditor doc={form.blocks} onChange={updateBlocksDoc} layout="compact" />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Loading block editor...
              </div>
            )}
          </TabsContent>

          <TabsContent value="plain" className="space-y-4">
            <div className="space-y-2">
              <Label>Body</Label>
              <div className="mb-1 flex items-center gap-1">
                {variables.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="rounded border border-primary/10 bg-primary/5 px-2 py-0.5 font-mono text-xs text-primary hover:bg-primary/10"
                  >
                    {variable}
                  </button>
                ))}
                <div className="ml-auto">
                  <AIEmailWriter
                    onInsert={(text) => setForm((prev) => ({ ...prev, body: text }))}
                    onInsertSubject={(text) => setForm((prev) => ({ ...prev, subject: text }))}
                  />
                </div>
              </div>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={10}
                placeholder="Hi {{FirstName}},"
              />
            </div>
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label className="text-xs">Template preset</Label>
                <Select
                  value={form.design_config?.presetId || "lead-magnet"}
                  onValueChange={(value) => applyVisualPreset(value as VisualTemplatePresetId)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visualTemplatePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary" className="mb-0.5 gap-1">
                <LayoutTemplate className="h-3.5 w-3.5" />
                Visual editor
              </Badge>
            </div>

            <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Preview as (first name)</Label>
                <Input
                  value={previewVariables.FirstName}
                  onChange={(e) => setPreviewVariables((prev) => ({ ...prev, FirstName: e.target.value }))}
                  placeholder="Ava"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Preview company</Label>
                <Input
                  value={previewVariables.CompanyName}
                  onChange={(e) => setPreviewVariables((prev) => ({ ...prev, CompanyName: e.target.value }))}
                  placeholder="Northstar"
                />
              </div>
            </div>

            {form.design_config && (
              <VisualTemplateCanvas
                config={form.design_config}
                variables={previewVariables}
                onConfigChange={replaceVisualConfig}
                onUpdateField={updateVisualConfig}
              />
            )}
          </TabsContent>
        </Tabs>

        <Button
          onClick={onSubmit}
          disabled={isPending || !form.name || (!form.subject && form.category !== FORM_CATEGORY) || !form.body}
          className="w-full sm:w-auto"
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>

      {!isCanvasEditor && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Live preview</p>
            <p className="text-xs text-muted-foreground">
              Variables are previewed with sample values so you can see what the final email looks like.
            </p>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Preview first name</Label>
              <Input
                value={previewVariables.FirstName}
                onChange={(e) => setPreviewVariables((prev) => ({ ...prev, FirstName: e.target.value }))}
                placeholder="Ava"
              />
            </div>
            <div className="space-y-2">
              <Label>Preview company</Label>
              <Input
                value={previewVariables.CompanyName}
                onChange={(e) => setPreviewVariables((prev) => ({ ...prev, CompanyName: e.target.value }))}
                placeholder="Northstar"
              />
            </div>
          </div>

          {form.category !== FORM_CATEGORY && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Subject</p>
              <p className="rounded-lg bg-background p-3 text-sm font-medium text-foreground">
                {replaceTemplateVariables(form.subject || "Your email subject will appear here", previewVariables)}
              </p>
            </div>
          )}

          <TemplatePreview
            html={form.html_body}
            body={form.body || "Start typing to see the preview."}
            className="min-h-[540px]"
            variables={previewVariables}
          />
        </div>
      )}

    </div>
  );

  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {form.category === FORM_CATEGORY ? "Forms" : "Templates"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {form.category === FORM_CATEGORY 
              ? "Create signup and lead capture forms." 
              : "Create plain emails or start from visual templates your team can edit."}
          </p>
        </div>
        <Dialog 
          open={createOpen} 
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open && form.category === FORM_CATEGORY) {
              navigate("/forms");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openCreateWithStarter("lead-magnet")}>
              <Plus className="w-4 h-4 mr-2" />
              {form.category === FORM_CATEGORY ? "New Form" : "New Template"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {form.category === FORM_CATEGORY ? "Create Form" : "Create Template"}
              </DialogTitle>
            </DialogHeader>
            {renderEditor(
              () => createTemplate.mutate(), 
              form.category === FORM_CATEGORY ? "Create Form" : "Create Template", 
              createTemplate.isPending
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Prebuilt Visual Templates</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {starterTemplates.map(({ preset, starter }, index) => (
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="stat-card !p-4"
            >
              <TemplatePreview html={starter.html_body} body={starter.body} scaled className="h-[270px]" />
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-semibold text-foreground">{preset.name}</h3>
                  <Badge variant="outline">{preset.defaultType}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">{preset.defaultSubject}</p>
                  <Button size="sm" onClick={() => openCreateWithStarter(preset.id)}>
                    Use Template
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : templates.length === 0 ? (
        <div className="stat-card !p-8 text-center">
          <p className="text-muted-foreground">
            No saved templates yet. Start with a visual preset or create a template from scratch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
            <TabsList>
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="form">Form Opt-in</TabsTrigger>
              <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-4">
            {(categoryFilter === "all" ? templates : templates.filter(t => t.category === categoryFilter)).map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="stat-card !p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-4 md:flex-row">
                  <TemplatePreview
                    html={template.html_body}
                    body={template.body}
                    scaled
                    className="h-[220px] w-full max-w-[280px] shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display font-semibold text-foreground">{template.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[template.type] || typeColors.Initial}`}>
                        {template.type}
                      </span>
                      <Badge variant={template.template_format === "visual" ? "default" : "outline"}>
                        {template.template_format === "visual" ? "Visual" : "Plain"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Subject: <span className="text-foreground">{replaceTemplateVariables(template.subject)}</span>
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{template.body}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => setPreviewTemplate(template)} className="rounded-lg p-2 transition-colors hover:bg-muted">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => openEditTemplate(template)} className="rounded-lg p-2 transition-colors hover:bg-muted">
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => duplicateTemplate.mutate(template)} className="rounded-lg p-2 transition-colors hover:bg-muted">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteTemplate.mutate(template.id)} className="rounded-lg p-2 transition-colors hover:bg-muted">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Template</DialogTitle>
          </DialogHeader>
          {renderEditor(() => updateTemplate.mutate(), "Save Changes", updateTemplate.isPending)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={previewTemplate.template_format === "visual" ? "default" : "outline"}>
                  {previewTemplate.template_format === "visual" ? "Visual" : "Plain"}
                </Badge>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[previewTemplate.type] || typeColors.Initial}`}>
                  {previewTemplate.type}
                </span>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Subject</p>
                <p className="rounded-lg bg-muted/50 p-3 text-sm font-medium text-foreground">
                  {replaceTemplateVariables(previewTemplate.subject)}
                </p>
              </div>

              <TemplatePreview html={previewTemplate.html_body} body={previewTemplate.body} />

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Plain text fallback</p>
                <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm text-foreground">
                  {previewTemplate.body}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
