import { useMemo, useState } from "react";
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
import AIEmailWriter from "@/components/AIEmailWriter";
import TemplatePreview from "@/components/TemplatePreview";
import {
  buildVisualTemplateContent,
  getStarterTemplate,
  replaceTemplateVariables,
  type TemplateFormat,
  type VisualTemplateConfig,
  type VisualTemplatePresetId,
  visualTemplatePresets,
} from "@/lib/template-presets";

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
  body: string;
  type: string;
  template_format: TemplateFormat;
  html_body: string | null;
  design_config: VisualTemplateConfig | null;
};

const createEmptyForm = (): TemplateFormState => ({
  name: "",
  subject: "",
  body: "",
  type: "Initial",
  template_format: "plain",
  html_body: null,
  design_config: null,
});

const isVisualTemplateConfig = (value: unknown): value is VisualTemplateConfig => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { presetId?: unknown }).presetId === "string";
};

const toFormState = (template: EmailTemplateRow): TemplateFormState => {
  const templateFormat = template.template_format === "visual" ? "visual" : "plain";
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

  return {
    name: template.name,
    subject: template.subject,
    body: template.body,
    type: template.type,
    template_format: templateFormat,
    html_body: template.html_body,
    design_config: visualConfig,
  };
};

const Templates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRow | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateRow | null>(null);
  const [form, setForm] = useState<TemplateFormState>(createEmptyForm());

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplateRow[];
    },
    enabled: !!user,
  });

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
        body: form.body,
        type: form.type,
        template_format: form.template_format,
        html_body: form.html_body,
        design_config: form.design_config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      setCreateOpen(false);
      setForm(createEmptyForm());
      toast.success("Template created!");
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
          body: form.body,
          type: form.type,
          template_format: form.template_format,
          html_body: form.html_body,
          design_config: form.design_config,
        })
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
        body: template.body,
        type: template.type,
        template_format: template.template_format,
        html_body: template.html_body,
        design_config: template.design_config,
      });

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
    setForm(getStarterTemplate(presetId));
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
      design_config: starter.design_config,
    }));
  };

  const updateVisualConfig = <K extends keyof VisualTemplateConfig>(key: K, value: VisualTemplateConfig[K]) => {
    setForm((prev) => {
      const currentConfig = prev.design_config || (getStarterTemplate("lead-magnet").design_config as VisualTemplateConfig);
      const nextConfig = { ...currentConfig, [key]: value };
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

  const changeFormat = (format: TemplateFormat) => {
    if (format === "visual") {
      applyVisualPreset(form.design_config?.presetId || "lead-magnet");
      return;
    }

    setForm((prev) => ({
      ...prev,
      template_format: "plain",
      html_body: null,
      design_config: null,
    }));
  };

  const renderEditor = (onSubmit: () => void, submitLabel: string, isPending: boolean) => (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Lead Magnet Download"
            />
          </div>
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
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            value={form.subject}
            onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            placeholder="Your resource for {{CompanyName}} is ready"
          />
        </div>

        <Tabs value={form.template_format} onValueChange={(value) => changeFormat(value as TemplateFormat)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plain">Plain Template</TabsTrigger>
            <TabsTrigger value="visual">Visual Template</TabsTrigger>
          </TabsList>

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
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Visual layout</p>
                  <p className="text-xs text-muted-foreground">Choose a prebuilt design, then edit the content below.</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  HTML + text fallback
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Preset</Label>
                <Select
                  value={form.design_config?.presetId || "lead-magnet"}
                  onValueChange={(value) => applyVisualPreset(value as VisualTemplatePresetId)}
                >
                  <SelectTrigger>
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
            </div>

            {form.design_config && (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Brand name</Label>
                    <Input
                      value={form.design_config.brandName}
                      onChange={(e) => updateVisualConfig("brandName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Eyebrow label</Label>
                    <Input
                      value={form.design_config.eyebrow}
                      onChange={(e) => updateVisualConfig("eyebrow", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Textarea
                    value={form.design_config.headline}
                    onChange={(e) => updateVisualConfig("headline", e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subheadline</Label>
                  <Textarea
                    value={form.design_config.subheadline}
                    onChange={(e) => updateVisualConfig("subheadline", e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Main copy</Label>
                  <Textarea
                    value={form.design_config.body}
                    onChange={(e) => updateVisualConfig("body", e.target.value)}
                    rows={5}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>CTA text</Label>
                    <Input
                      value={form.design_config.ctaText}
                      onChange={(e) => updateVisualConfig("ctaText", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA URL</Label>
                    <Input
                      value={form.design_config.ctaUrl}
                      onChange={(e) => updateVisualConfig("ctaUrl", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hero image URL</Label>
                  <Input
                    value={form.design_config.heroImageUrl}
                    onChange={(e) => updateVisualConfig("heroImageUrl", e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Supporting section title</Label>
                    <Input
                      value={form.design_config.secondaryTitle}
                      onChange={(e) => updateVisualConfig("secondaryTitle", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Footer note</Label>
                    <Input
                      value={form.design_config.footerNote}
                      onChange={(e) => updateVisualConfig("footerNote", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Supporting copy</Label>
                  <Textarea
                    value={form.design_config.secondaryBody}
                    onChange={(e) => updateVisualConfig("secondaryBody", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Accent color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={form.design_config.accentColor}
                        onChange={(e) => updateVisualConfig("accentColor", e.target.value)}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={form.design_config.accentColor}
                        onChange={(e) => updateVisualConfig("accentColor", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Background color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={form.design_config.backgroundColor}
                        onChange={(e) => updateVisualConfig("backgroundColor", e.target.value)}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={form.design_config.backgroundColor}
                        onChange={(e) => updateVisualConfig("backgroundColor", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plain text fallback</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is generated automatically for inboxes that do not render rich HTML.
                  </p>
                  <div className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-sm text-foreground">
                    {form.body}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button
          onClick={onSubmit}
          disabled={isPending || !form.name || !form.subject || !form.body}
          className="w-full sm:w-auto"
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Live preview</p>
          <p className="text-xs text-muted-foreground">
            Variables are previewed with sample values so you can see what the final email looks like.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="mb-2 text-xs text-muted-foreground">Subject</p>
          <p className="rounded-lg bg-background p-3 text-sm font-medium text-foreground">
            {replaceTemplateVariables(form.subject || "Your email subject will appear here")}
          </p>
        </div>

        <TemplatePreview
          html={form.html_body}
          body={form.body || "Start typing to see the preview."}
          className="min-h-[540px]"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create plain emails or start from visual templates your team can edit.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setForm(createEmptyForm())}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Create Template</DialogTitle>
            </DialogHeader>
            {renderEditor(() => createTemplate.mutate(), "Create Template", createTemplate.isPending)}
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
        <div className="grid gap-4">
          {templates.map((template, index) => (
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
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
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
