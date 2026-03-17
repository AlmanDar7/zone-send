import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Send, Mail, MessageSquare } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { useEffect } from "react";

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription for dashboard auto-refresh
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["emails-sent-today"] });
        queryClient.invalidateQueries({ queryKey: ["replies-count"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-daily"] });
        queryClient.invalidateQueries({ queryKey: ["recent-contacts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "email_queue" }, () => {
        queryClient.invalidateQueries({ queryKey: ["emails-sent-today"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-daily"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["contacts-count"] });
        queryClient.invalidateQueries({ queryKey: ["recent-contacts"] });
        queryClient.invalidateQueries({ queryKey: ["replies-count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const { data: contacts } = useQuery({
    queryKey: ["contacts-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("contacts").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").eq("status", "Running");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: emailsSentToday } = useQuery({
    queryKey: ["emails-sent-today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("email_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", today);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: replies } = useQuery({
    queryKey: ["replies-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("status", "Replied");
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: recentContacts } = useQuery({
    queryKey: ["recent-contacts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: campaignList } = useQuery({
    queryKey: ["campaigns-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  // Real chart data - last 7 days from email_queue and email_events
  const { data: emailData = [] } = useQuery({
    queryKey: ["dashboard-daily", user?.id],
    queryFn: async () => {
      const days = 7;
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split("T")[0];
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split("T")[0];

        const [sentRes, repliesRes] = await Promise.all([
          supabase.from("email_queue").select("*", { count: "exact", head: true })
            .eq("status", "sent").gte("sent_at", dayStr).lt("sent_at", nextDayStr),
          supabase.from("email_events").select("*", { count: "exact", head: true })
            .eq("event_type", "open").gte("created_at", dayStr).lt("created_at", nextDayStr),
        ]);

        result.push({
          date: date.toLocaleDateString("en", { weekday: "short" }),
          sent: sentRes.count || 0,
          opens: repliesRes.count || 0,
        });
      }
      return result;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Campaign overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Users} title="Total Contacts" value={contacts?.toLocaleString() || "0"} />
        <StatCard icon={Send} title="Active Campaigns" value={campaigns?.length || 0} />
        <StatCard icon={Mail} title="Emails Sent Today" value={emailsSentToday || 0} />
        <StatCard icon={MessageSquare} title="Total Replies" value={replies || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card lg:col-span-2 !p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Email Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={emailData}>
              <defs>
                <linearGradient id="sentGradD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="sent" stroke="hsl(168, 80%, 36%)" fill="url(#sentGradD)" strokeWidth={2} name="Sent" />
              <Area type="monotone" dataKey="opens" stroke="hsl(210, 92%, 55%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Opens" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card !p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentContacts && recentContacts.length > 0 ? recentContacts.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  c.status === "Replied" ? "bg-success" : c.status === "Bounced" ? "bg-destructive" : "bg-primary"
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.status} · {c.email}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No contacts yet. Add contacts to get started.</p>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card !p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Campaigns</h3>
        {campaignList && campaignList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Campaign</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Daily Limit</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaignList.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "Running" ? "bg-success/10 text-success" :
                        c.status === "Paused" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{c.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{c.daily_limit}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No campaigns yet. Create one to start sending emails.</p>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
