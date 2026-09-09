import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import VisualTemplateCanvas from "@/components/VisualTemplateCanvas";
import { buildLeadMagnetHtmlFromOrder } from "@/lib/visual-template-sections";
import {
  getStarterTemplate,
  sampleTemplateVariables,
  visualTemplatePresets,
  type VisualTemplateConfig,
  type TemplateVariableValues,
} from "@/lib/template-presets";

type EmailTemplateRow = any;

type FormState = {
  name: string;
  subject: string; // Form doesn't really use subject, but db requires it
  preview_text: string;
  body: string;
  type: string;
  category: "form";
  template_format: "visual";
  html_body: string | null;
  design_config: VisualTemplateConfig | null;
};

const createEmptyForm = (): FormState => ({
  name: "Untitled Form",
  subject: "Form Submission",
  preview_text: "",
  body: "This is a form layout.",
  type: "Initial",
  category: "form",
  template_format: "visual",
  html_body: null,
  design_config: null,
});

const isVisualTemplateConfig = (value: unknown): value is VisualTemplateConfig => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { presetId?: unknown }).presetId === "string";
};

const toFormState = (template: EmailTemplateRow): FormState => {
  const fallbackStarter = getStarterTemplate("popup-form");
  const visualConfig = isVisualTemplateConfig(template.design_config)
    ? template.design_config
    : {
        ...(fallbackStarter.design_config as VisualTemplateConfig),
        headline: template.name,
      };

  return {
    name: template.name,
    subject: template.subject || "Form Submission",
    preview_text: template.preview_text || "",
    body: template.body || "",
    type: template.type,
    category: "form",
    template_format: "visual",
    html_body: template.html_body,
    design_config: visualConfig,
  };
};

const FormBuilder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [previewVariables] = useState<TemplateVariableValues>(sampleTemplateVariables);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRow | null>(null);

  const editId = searchParams.get("edit");
  const isNew = searchParams.get("new") === "1";
  const presetId = searchParams.get("preset");

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", user?.id],
    queryFn: async () => {
      const data = await api.templates.list('form');
      return data as EmailTemplateRow[];
    },
    enabled: !!user && !!editId,
  });

  useEffect(() => {
    if (isNew) {
      let initialForm = createEmptyForm();
      if (presetId) {
        const preset = visualTemplatePresets.find((p) => p.id === presetId && p.category === "form");
        if (preset) {
          const config = preset.createConfig();
          initialForm = {
            ...initialForm,
            name: preset.name,
            design_config: config,
            html_body: buildLeadMagnetHtmlFromOrder(config),
          };
        }
      } else {
        const starter = getStarterTemplate("lead-magnet");
        const config = starter.design_config as VisualTemplateConfig;
        initialForm = {
          ...initialForm,
          design_config: config,
          html_body: starter.html_body ?? buildLeadMagnetHtmlFromOrder(config),
        };
      }
      setForm(initialForm);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      next.delete("preset");
      setSearchParams(next, { replace: true });
    } else if (editId && templates.length > 0) {
      const found = templates.find((t) => t.id === editId);
      if (found) {
        setSelectedTemplate(found);
        setForm(toFormState(found));
        const next = new URLSearchParams(searchParams);
        next.delete("edit");
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, templates, setSearchParams, isNew, editId, presetId]);

  const saveMutation = useMutation({
    mutationFn: async ({ isNext = false }: { isNext?: boolean }) => {
      const payload = {
        name: form.name,
        subject: form.subject,
        preview_text: form.preview_text,
        body: form.body,
        type: form.type,
        category: form.category,
        template_format: form.template_format,
        html_body: form.html_body,
        design_config: form.design_config,
      };
      const template = selectedTemplate
        ? await api.templates.update(selectedTemplate.id, payload)
        : await api.templates.create(payload);
      return { template, isNext, wasNew: !selectedTemplate };
    },
    onSuccess: ({ template, isNext, wasNew }) => {
      setSelectedTemplate(template);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      toast.success(wasNew ? "Form created!" : "Form saved!");
      
      if (isNext) {
        navigate(`/forms/${template.id}/publish`);
      } else if (wasNew) {
        navigate(`/forms/builder?edit=${template.id}`, { replace: true });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isSaving = saveMutation.isPending;

  return (
    <div className="flex h-screen w-full flex-col bg-muted/10 font-sans">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted" onClick={() => navigate("/forms/templates")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Form Builder</span>
            <span className="text-xs text-muted-foreground truncate max-w-[250px]">{form.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/forms/templates")}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-full px-5"
            onClick={() => saveMutation.mutate({ isNext: false })}
            disabled={isSaving || !form.name}
          >
            Save Draft
          </Button>
          <Button 
            size="sm" 
            className="bg-foreground text-background hover:bg-foreground/90 px-7 rounded-full shadow-md"
            onClick={() => saveMutation.mutate({ isNext: true })}
            disabled={isSaving || !form.name}
          >
            Publish
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-border space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Internal Name
              </Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="e.g. Newsletter Signup"
                className="bg-muted/30 focus-visible:ring-1"
              />
            </div>
            
            {/* Future: Add Segment selection dropdown here */}
          </div>
          
          <div className="p-4 flex-1">
            {form.design_config && (
              <VisualTemplateCanvas
                config={form.design_config}
                onConfigChange={(config) => setForm({ ...form, design_config: config, html_body: buildLeadMagnetHtmlFromOrder(config) })}
                onUpdateField={(key, value) => {
                  const newConfig = { ...form.design_config!, [key]: value };
                  setForm({ ...form, design_config: newConfig, html_body: buildLeadMagnetHtmlFromOrder(newConfig) });
                }}
                variables={previewVariables}
                layout="sidebar"
                hideCanvas={true}
              />
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-muted/10 p-8 flex justify-center custom-scrollbar">
          {form.design_config ? (
            <div className="w-full max-w-[600px] bg-background rounded-none sm:rounded-2xl shadow-xl overflow-hidden border border-border mt-4 mb-16">
              <VisualTemplateCanvas
                config={form.design_config}
                onConfigChange={(config) => setForm({ ...form, design_config: config, html_body: buildLeadMagnetHtmlFromOrder(config) })}
                onUpdateField={(key, value) => {
                  const newConfig = { ...form.design_config!, [key]: value };
                  setForm({ ...form, design_config: newConfig, html_body: buildLeadMagnetHtmlFromOrder(newConfig) });
                }}
                variables={previewVariables}
                layout="compact"
                hideSidebar={true}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              Loading editor...
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FormBuilder;
