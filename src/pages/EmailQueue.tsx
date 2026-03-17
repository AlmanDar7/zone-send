import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const queueStatusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  sent: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

const EmailQueue = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-filter", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("id, name").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ["email-queue", user?.id, statusFilter, campaignFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_queue")
        .select("*, contacts(name, email), campaigns(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (campaignFilter !== "all") query = query.eq("campaign_id", campaignFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const retryFailed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_queue").update({ status: "pending", error_message: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-queue"] });
      toast.success("Email re-queued for sending");
    },
  });

  const exportCsv = () => {
    const headers = ["Contact", "Email", "Campaign", "Step", "Status", "Scheduled", "Sent At", "Error"];
    const rows = queueItems.map((q: any) => [
      (q.contacts as any)?.name || "",
      (q.contacts as any)?.email || "",
      (q.campaigns as any)?.name || "",
      q.step_number,
      q.status,
      new Date(q.scheduled_at).toLocaleString(),
      q.sent_at ? new Date(q.sent_at).toLocaleString() : "",
      q.error_message || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email-queue.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    pending: queueItems.filter((q: any) => q.status === "pending").length,
    sent: queueItems.filter((q: any) => q.status === "sent").length,
    failed: queueItems.filter((q: any) => q.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Email Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor and manage your email sending queue</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["email-queue"] })}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="w-5 h-5 text-warning" /></div>
          <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-display font-bold text-foreground">{stats.pending}</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div>
          <div><p className="text-sm text-muted-foreground">Sent</p><p className="text-2xl font-display font-bold text-foreground">{stats.sent}</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><XCircle className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-sm text-muted-foreground">Failed</p><p className="text-2xl font-display font-bold text-foreground">{stats.failed}</p></div>
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading queue...</p>
      ) : queueItems.length === 0 ? (
        <div className="stat-card !p-8 text-center">
          <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No emails in queue. Start a campaign to begin sending.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Contact</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Campaign</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Step</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Opens</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Clicks</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Scheduled</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Sent</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((q: any) => (
                  <tr key={q.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground">{(q.contacts as any)?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{(q.contacts as any)?.email || ""}</p>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{(q.campaigns as any)?.name || "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{q.step_number}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${queueStatusColors[q.status] || "bg-muted text-muted-foreground"}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{q.open_count}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{q.click_count}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(q.scheduled_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{q.sent_at ? new Date(q.sent_at).toLocaleString() : "—"}</td>
                    <td className="py-3 px-4 text-right">
                      {q.status === "failed" && (
                        <Button variant="ghost" size="sm" onClick={() => retryFailed.mutate(q.id)} className="text-xs">
                          <RefreshCw className="w-3 h-3 mr-1" />Retry
                        </Button>
                      )}
                      {q.error_message && (
                        <p className="text-[10px] text-destructive mt-1 max-w-[200px] truncate" title={q.error_message}>
                          {q.error_message}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EmailQueue;
