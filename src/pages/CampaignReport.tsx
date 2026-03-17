import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Eye, MousePointerClick, MessageSquare, AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const CampaignReport = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign } = useQuery({
    queryKey: ["campaign-report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: steps = [] } = useQuery({
    queryKey: ["campaign-report-steps", id],
    queryFn: async () => {
      const { data } = await supabase.from("campaign_steps").select("*, email_templates(name)").eq("campaign_id", id!).order("step_number");
      return data || [];
    },
    enabled: !!user && !!id,
  });

  const { data: queueStats = [] } = useQuery({
    queryKey: ["campaign-report-queue", id],
    queryFn: async () => {
      const { data } = await supabase.from("email_queue").select("step_number, status, variant, open_count, click_count").eq("campaign_id", id!);
      return data || [];
    },
    enabled: !!user && !!id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["campaign-report-events", id],
    queryFn: async () => {
      const { data } = await supabase.from("email_events").select("event_type, email_queue_id").eq("campaign_id", id!);
      return data || [];
    },
    enabled: !!user && !!id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["campaign-report-contacts", id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, name, email, status, lead_score").eq("campaign_id", id!).order("lead_score", { ascending: false });
      return data || [];
    },
    enabled: !!user && !!id,
  });

  // Per-step stats
  const stepStats = steps.map((step: any) => {
    const stepQueue = queueStats.filter((q: any) => q.step_number === step.step_number);
    const sent = stepQueue.filter((q: any) => q.status === "sent").length;
    const pending = stepQueue.filter((q: any) => q.status === "pending").length;
    const failed = stepQueue.filter((q: any) => q.status === "failed").length;
    const opens = stepQueue.reduce((sum: number, q: any) => sum + (q.open_count || 0), 0);
    const clicks = stepQueue.reduce((sum: number, q: any) => sum + (q.click_count || 0), 0);
    const variantA = stepQueue.filter((q: any) => q.variant === "a" && q.status === "sent").length;
    const variantB = stepQueue.filter((q: any) => q.variant === "b" && q.status === "sent").length;

    return {
      step: step.step_number,
      name: (step.email_templates as any)?.name || `Step ${step.step_number}`,
      sent, pending, failed, opens, clicks,
      openRate: sent > 0 ? ((opens / sent) * 100).toFixed(1) : "0",
      clickRate: sent > 0 ? ((clicks / sent) * 100).toFixed(1) : "0",
      abEnabled: step.ab_test_enabled,
      winningVariant: step.winning_variant,
      variantA, variantB,
    };
  });

  const totalSent = queueStats.filter((q: any) => q.status === "sent").length;
  const totalOpens = queueStats.reduce((s: number, q: any) => s + (q.open_count || 0), 0);
  const totalClicks = queueStats.reduce((s: number, q: any) => s + (q.click_count || 0), 0);
  const replied = contacts.filter((c: any) => c.status === "Replied").length;
  const bounced = contacts.filter((c: any) => c.status === "Bounced").length;

  const chartData = stepStats.map(s => ({
    name: `Step ${s.step}`,
    sent: s.sent,
    opens: s.opens,
    clicks: s.clicks,
  }));

  const exportReport = () => {
    const headers = ["Step", "Template", "Sent", "Opens", "Open Rate", "Clicks", "Click Rate", "Failed", "A/B Winner"];
    const rows = stepStats.map(s => [s.step, s.name, s.sent, s.opens, `${s.openRate}%`, s.clicks, `${s.clickRate}%`, s.failed, s.winningVariant || "—"]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${campaign?.name || "campaign"}-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!campaign) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{campaign.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Campaign Performance Report</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportReport}><Download className="w-4 h-4 mr-2" />Export Report</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Eye, label: "Sent", value: totalSent, color: "bg-primary/10 text-primary" },
          { icon: Eye, label: "Opens", value: totalOpens, color: "bg-success/10 text-success" },
          { icon: MousePointerClick, label: "Clicks", value: totalClicks, color: "bg-info/10 text-info" },
          { icon: MessageSquare, label: "Replies", value: replied, color: "bg-accent/10 text-accent-foreground" },
          { icon: AlertTriangle, label: "Bounces", value: bounced, color: "bg-destructive/10 text-destructive" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color.split(" ")[0]}`}>
              <stat.icon className={`w-4 h-4 ${stat.color.split(" ")[1]}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card !p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Performance by Step</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="sent" fill="hsl(168, 80%, 36%)" name="Sent" radius={[4,4,0,0]} />
              <Bar dataKey="opens" fill="hsl(210, 92%, 55%)" name="Opens" radius={[4,4,0,0]} />
              <Bar dataKey="clicks" fill="hsl(38, 92%, 50%)" name="Clicks" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet. Start the campaign to see results.</p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card !p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Step Details</h3>
        <div className="space-y-3">
          {stepStats.map(s => (
            <div key={s.step} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-background">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{s.step}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Sent: {s.sent}</span>
                  <span>Opens: {s.opens} ({s.openRate}%)</span>
                  <span>Clicks: {s.clicks} ({s.clickRate}%)</span>
                  {s.failed > 0 && <span className="text-destructive">Failed: {s.failed}</span>}
                </div>
              </div>
              {s.abEnabled && (
                <div className="flex items-center gap-2 text-xs">
                  <FlaskConical className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">A:{s.variantA} B:{s.variantB}</span>
                  {s.winningVariant && <span className="text-success font-medium">Winner: {s.winningVariant.toUpperCase()}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card !p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Campaign Contacts ({contacts.length})</h3>
        {contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Lead Score</th>
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 20).map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium text-foreground">{c.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{c.email}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "Replied" ? "bg-success/10 text-success" :
                        c.status === "Bounced" ? "bg-destructive/10 text-destructive" :
                        "bg-primary/10 text-primary"
                      }`}>{c.status}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">{c.lead_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No contacts assigned to this campaign.</p>
        )}
      </motion.div>
    </div>
  );
};

export default CampaignReport;
