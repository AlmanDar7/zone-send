import { useState } from "react";
import { Plus, Copy, Trash2, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  type: "Initial" | "Follow-up 1" | "Follow-up 2" | "Follow-up 3" | "Final";
  updatedAt: string;
}

const mockTemplates: EmailTemplate[] = [
  {
    id: 1,
    name: "SaaS Introduction",
    subject: "Quick question about {{CompanyName}}",
    body: "Hi {{FirstName}},\n\nI noticed that {{CompanyName}} is growing fast. I'd love to show you how our platform can help scale your outreach.\n\nWould you be open to a quick 15-min call this week?\n\nBest,\nAlex",
    type: "Initial",
    updatedAt: "2026-03-10",
  },
  {
    id: 2,
    name: "Gentle Nudge",
    subject: "Re: Quick question about {{CompanyName}}",
    body: "Hi {{FirstName}},\n\nJust wanted to bump this to the top of your inbox. I think there's a real fit here.\n\nHappy to work around your schedule.\n\nBest,\nAlex",
    type: "Follow-up 1",
    updatedAt: "2026-03-09",
  },
  {
    id: 3,
    name: "Value Add",
    subject: "Re: Quick question about {{CompanyName}}",
    body: "Hi {{FirstName}},\n\nI put together a quick case study that might be relevant to {{CompanyName}}. Companies in your space are seeing 3x improvement in response rates.\n\nWorth a look?\n\nBest,\nAlex",
    type: "Follow-up 2",
    updatedAt: "2026-03-08",
  },
];

const variables = ["{{FirstName}}", "{{Email}}", "{{CompanyName}}"];

const Templates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const typeColors: Record<string, string> = {
    Initial: "bg-primary/10 text-primary",
    "Follow-up 1": "bg-info/10 text-info",
    "Follow-up 2": "bg-warning/10 text-warning",
    "Follow-up 3": "bg-destructive/10 text-destructive",
    Final: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage email templates</p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />New Template</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground mr-2 self-center">Variables:</p>
        {variables.map((v) => (
          <span key={v} className="px-2.5 py-1 rounded-md bg-primary/5 text-primary text-xs font-mono border border-primary/10">
            {v}
          </span>
        ))}
      </div>

      <div className="grid gap-4">
        {mockTemplates.map((template, i) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card !p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-semibold text-foreground">{template.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[template.type]}`}>
                    {template.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Subject: <span className="text-foreground">{template.subject}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{template.body}</p>
                <p className="text-xs text-muted-foreground mt-3">Updated {template.updatedAt}</p>
              </div>

              <div className="flex items-center gap-1 ml-4">
                <Dialog open={previewOpen && selectedTemplate?.id === template.id} onOpenChange={(open) => { setPreviewOpen(open); if (open) setSelectedTemplate(template); }}>
                  <DialogTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Preview">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display">Preview: {template.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Subject</p>
                        <p className="text-sm font-medium text-foreground bg-muted/50 p-3 rounded-lg">
                          {template.subject.replace(/\{\{(\w+)\}\}/g, (_, v) => {
                            const map: Record<string, string> = { FirstName: "Sarah", Email: "sarah@techcorp.com", CompanyName: "TechCorp" };
                            return map[v] || `{{${v}}}`;
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Body</p>
                        <div className="text-sm text-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                          {template.body.replace(/\{\{(\w+)\}\}/g, (_, v) => {
                            const map: Record<string, string> = { FirstName: "Sarah", Email: "sarah@techcorp.com", CompanyName: "TechCorp" };
                            return map[v] || `{{${v}}}`;
                          })}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Edit">
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Duplicate">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Templates;
