import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Eye, Edit3, Copy, Trash2, Send, Calendar, MoreHorizontal,
  Mail, MousePointerClick, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import TemplatePreview from "@/components/TemplatePreview";
import EmptyState from "@/components/EmptyState";
import { replaceTemplateVariables } from "@/lib/template-presets";

type EmailRow = Database["public"]["Tables"]["email_templates"]["Row"];

type Stats = { sent: number; opens: number; clicks: number };

const Emails = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [previewEmail, setPreviewEmail] = useState<EmailRow | null>(null);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailRow[];
    },
    enabled: !!user,
  });

  // Derive engagement stats by joining queue + events for templates that have been used
  const { data: statsByTemplate = {} } = useQuery({
    queryKey: ["email-stats", user?.id],
    queryFn: async (): Promise<Record<string, Stats>> => {
      // Stats via campaigns/queue is complex; for now show zeros if not available
      const { data: events } = await supabase
        .from("email_events")
        .select("event_type, campaign_id");
      // Without a direct campaign_id->template_id mapping per send,
      // we approximate by leaving per-template stats at 0 unless used in steps.
      return {};
    },
    enabled: !!user,
  });

  const duplicate = useMutation({
    mutationFn: async (t: EmailRow) => {
      const { error } = await supabase.from("email_templates").insert({
        user_id: user!.id,
        name: `${t.name} (Copy)`,
        subject: t.subject,
        body: t.body,
        type: t.type,
        template_format: t.template_format,
        html_body: t.html_body,
        design_config: t.design_config,
        blocks: t.blocks,
        category: t.category,
        tags: t.tags,
      } as Database["public"]["Tables"]["email_templates"]["Insert"]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      toast.success("Email duplicated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      toast.success("Email deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["all"]);
    emails.forEach((e) => e.category && set.add(e.category));
    return Array.from(set);
  }, [emails]);

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      const matchSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.subject.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "all" || e.category === category;
      return matchSearch && matchCat;
    });
  }, [emails, search, category]);

  const totals = useMemo(() => {
    const stats = Object.values(statsByTemplate);
    const sent = stats.reduce((s, x) => s + x.sent, 0);
    const opens = stats.reduce((s, x) => s + x.opens, 0);
    const clicks = stats.reduce((s, x) => s + x.clicks, 0);
    return {
      total: emails.length,
      sent,
      openRate: sent ? Math.round((opens / sent) * 100) : 0,
      clickRate: sent ? Math.round((clicks / sent) * 100) : 0,
    };
  }, [emails, statsByTemplate]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Emails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Design beautiful emails, manage templates, and track performance.
          </p>
        </div>
        <Button onClick={() => navigate("/templates?new=1")} size="lg" className="rounded-full shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          New Email
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Mail} label="Total emails" value={totals.total.toString()} />
        <StatTile icon={Send} label="Sent" value={totals.sent.toString()} />
        <StatTile icon={TrendingUp} label="Open rate" value={`${totals.openRate}%`} accent />
        <StatTile icon={MousePointerClick} label="Click rate" value={`${totals.clickRate}%`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or subject..."
            className="rounded-full border-border/60 bg-card pl-9"
          />
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="rounded-full bg-muted/60 p-1">
            {categories.map((c) => (
              <TabsTrigger key={c} value={c} className="rounded-full px-4 capitalize data-[state=active]:bg-background">
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={emails.length === 0 ? "No emails yet" : "No matches"}
          description={
            emails.length === 0
              ? "Start by creating your first email. Choose from beautiful templates or design from scratch."
              : "Try adjusting your search or category filters."
          }
          actionLabel={emails.length === 0 ? "Create your first email" : undefined}
          onAction={emails.length === 0 ? () => navigate("/templates?new=1") : undefined}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((email, i) => {
            const stats = statsByTemplate[email.id];
            const status = stats?.sent ? "Sent" : "Draft";
            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className="relative h-56 cursor-pointer overflow-hidden bg-muted/30"
                  onClick={() => setPreviewEmail(email)}
                >
                  <TemplatePreview
                    html={email.html_body}
                    body={email.body}
                    scaled
                    className="h-full w-full !rounded-none border-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute right-3 top-3 flex items-center gap-1.5">
                    <Badge
                      className={
                        status === "Sent"
                          ? "bg-success/90 text-success-foreground hover:bg-success"
                          : "bg-background/90 text-foreground hover:bg-background"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-base font-semibold text-foreground">
                        {email.name}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {replaceTemplateVariables(email.subject)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setPreviewEmail(email)}>
                          <Eye className="mr-2 h-4 w-4" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/templates?edit=${email.id}`)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate.mutate(email)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/campaigns")}>
                          <Calendar className="mr-2 h-4 w-4" /> Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/campaigns")}>
                          <Send className="mr-2 h-4 w-4" /> Send
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete "${email.name}"?`)) remove.mutate(email.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <Metric label="Open" value={stats?.sent ? `${Math.round((stats.opens / stats.sent) * 100)}%` : "—"} />
                    <Metric label="Click" value={stats?.sent ? `${Math.round((stats.clicks / stats.sent) * 100)}%` : "—"} />
                    <Metric label="Date" value={new Date(email.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewEmail} onOpenChange={(o) => !o && setPreviewEmail(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{previewEmail?.name}</DialogTitle>
          </DialogHeader>
          {previewEmail && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-xs text-muted-foreground">Subject:</span>{" "}
                <span className="font-medium">{replaceTemplateVariables(previewEmail.subject)}</span>
              </div>
              <TemplatePreview html={previewEmail.html_body} body={previewEmail.body} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatTile = ({ icon: Icon, label, value, accent }: { icon: typeof Mail; label: string; value: string; accent?: boolean }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default Emails;
