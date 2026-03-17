import { useState } from "react";
import { Plus, Copy, Trash2, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AIEmailWriter from "@/components/AIEmailWriter";

const variables = ["{{FirstName}}", "{{Email}}", "{{CompanyName}}"];
const typeColors: Record<string, string> = {
  Initial: "bg-primary/10 text-primary",
  "Follow-up 1": "bg-info/10 text-info",
  "Follow-up 2": "bg-warning/10 text-warning",
  "Follow-up 3": "bg-destructive/10 text-destructive",
  Final: "bg-muted text-muted-foreground",
};

const Templates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", type: "Initial" });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_templates").insert({ user_id: user!.id, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setCreateOpen(false);
      setForm({ name: "", subject: "", body: "", type: "Initial" });
      toast.success("Template created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_templates").update(form).eq("id", selectedTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setEditOpen(false);
      toast.success("Template updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from("email_templates").insert({
        user_id: user!.id, name: `${t.name} (Copy)`, subject: t.subject, body: t.body, type: t.type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template duplicated!");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    },
  });

  const renderPreview = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, v) => {
      const map: Record<string, string> = { FirstName: "Sarah", Email: "sarah@techcorp.com", CompanyName: "TechCorp" };
      return map[v] || `{{${v}}}`;
    });

  const insertVariable = (v: string) => setForm((prev) => ({ ...prev, body: prev.body + v }));

  const renderForm = (onSubmit: () => void, submitLabel: string, isPending: boolean) => (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="SaaS Introduction" /></div>
      <div className="space-y-2"><Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Initial", "Follow-up 1", "Follow-up 2", "Follow-up 3", "Final"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder="Quick question about {{CompanyName}}" /></div>
      <div className="space-y-2">
        <Label>Body</Label>
        <div className="flex items-center gap-1 mb-1">
          {variables.map((v) => (
            <button key={v} type="button" onClick={() => insertVariable(v)} className="px-2 py-0.5 rounded bg-primary/5 text-primary text-xs font-mono border border-primary/10 hover:bg-primary/10">{v}</button>
          ))}
          <div className="ml-auto">
            <AIEmailWriter
              onInsert={(text) => setForm((prev) => ({ ...prev, body: text }))}
              onInsertSubject={(text) => setForm((prev) => ({ ...prev, subject: text }))}
            />
          </div>
        </div>
        <Textarea value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} rows={8} placeholder="Hi {{FirstName}}," />
      </div>
      <Button onClick={onSubmit} disabled={isPending || !form.name || !form.subject || !form.body}>{isPending ? "Saving..." : submitLabel}</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage email templates</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />New Template</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Create Template</DialogTitle></DialogHeader>
            {renderForm(() => createTemplate.mutate(), "Create Template", createTemplate.isPending)}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : templates.length === 0 ? (
        <div className="stat-card !p-8 text-center">
          <p className="text-muted-foreground">No templates yet. Create one to use in your campaigns.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template: any, i: number) => (
            <motion.div key={template.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card !p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display font-semibold text-foreground">{template.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[template.type] || typeColors.Initial}`}>{template.type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Subject: <span className="text-foreground">{template.subject}</span></p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{template.body}</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Dialog open={previewOpen && selectedTemplate?.id === template.id} onOpenChange={(open) => { setPreviewOpen(open); if (open) setSelectedTemplate(template); }}>
                    <DialogTrigger asChild><button className="p-2 rounded-lg hover:bg-muted transition-colors"><Eye className="w-4 h-4 text-muted-foreground" /></button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle className="font-display">Preview: {template.name}</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div><p className="text-xs text-muted-foreground mb-1">Subject</p><p className="text-sm font-medium text-foreground bg-muted/50 p-3 rounded-lg">{renderPreview(template.subject)}</p></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Body</p><div className="text-sm text-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">{renderPreview(template.body)}</div></div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <button onClick={() => { setSelectedTemplate(template); setForm({ name: template.name, subject: template.subject, body: template.body, type: template.type }); setEditOpen(true); }} className="p-2 rounded-lg hover:bg-muted transition-colors"><Edit3 className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => duplicateTemplate.mutate(template)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Copy className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => deleteTemplate.mutate(template.id)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Edit Template</DialogTitle></DialogHeader>
          {renderForm(() => updateTemplate.mutate(), "Save Changes", updateTemplate.isPending)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
