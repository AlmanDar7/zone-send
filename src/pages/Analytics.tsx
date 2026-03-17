import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Eye, MousePointerClick, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Analytics = () => {
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-analytics", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("id, name").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["analytics-stats", user?.id, selectedCampaign],
    queryFn: async () => {
      let sentQuery = supabase.from("email_queue").select("*", { count: "exact", head: true }).eq("status", "sent");
      let eventsQuery = supabase.from("email_events").select("*");
      let contactsQuery = supabase.from("contacts").select("*", { count: "exact", head: true });

      if (selectedCampaign !== "all") {
        sentQuery = sentQuery.eq("campaign_id", selectedCampaign);
        eventsQuery = eventsQuery.eq("campaign_id", selectedCampaign);
        contactsQuery = contactsQuery.eq("campaign_id", selectedCampaign);
      }

      const [sentRes, eventsRes, repliedRes, bouncedRes] = await Promise.all([
        sentQuery,
        eventsQuery,
        contactsQuery.eq("status", "Replied"),
        contactsQuery.eq("status", "Bounced"),
      ]);

      const events = eventsRes.data || [];
      const opens = events.filter(e => e.event_type === "open");
      const clicks = events.filter(e => e.event_type === "click");
      const uniqueOpens = new Set(opens.map(e => e.contact_id)).size;
      const uniqueClicks = new Set(clicks.map(e => e.contact_id)).size;
      const totalSent = sentRes.count || 0;

      return {
        totalSent,
        totalOpens: opens.length,
        uniqueOpens,
        totalClicks: clicks.length,
        uniqueClicks,
        replies: repliedRes.count || 0,
        bounces: bouncedRes.count || 0,
        openRate: totalSent > 0 ? ((uniqueOpens / totalSent) * 100).toFixed(1) : "0",
        clickRate: totalSent > 0 ? ((uniqueClicks / totalSent) * 100).toFixed(1) : "0",
        replyRate: totalSent > 0 ? (((repliedRes.count || 0) / totalSent) * 100).toFixed(1) : "0",
        bounceRate: totalSent > 0 ? (((bouncedRes.count || 0) / totalSent) * 100).toFixed(1) : "0",
      };
    },
    enabled: !!user,
  });

  // Daily activity for chart (last 7 days)
  const { data: dailyData = [] } = useQuery({
    queryKey: ["analytics-daily", user?.id, selectedCampaign],
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

        let sentQ = supabase.from("email_queue").select("*", { count: "exact", head: true })
          .eq("status", "sent").gte("sent_at", dayStr).lt("sent_at", nextDayStr);
        let opensQ = supabase.from("email_events").select("*", { count: "exact", head: true })
          .eq("event_type", "open").gte("created_at", dayStr).lt("created_at", nextDayStr);
        let clicksQ = supabase.from("email_events").select("*", { count: "exact", head: true })
          .eq("event_type", "click").gte("created_at", dayStr).lt("created_at", nextDayStr);

        if (selectedCampaign !== "all") {
          sentQ = sentQ.eq("campaign_id", selectedCampaign);
          opensQ = opensQ.eq("campaign_id", selectedCampaign);
          clicksQ = clicksQ.eq("campaign_id", selectedCampaign);
        }

        const [s, o, c] = await Promise.all([sentQ, opensQ, clicksQ]);
        result.push({
          date: date.toLocaleDateString("en", { weekday: "short" }),
          sent: s.count || 0,
          opens: o.count || 0,
          clicks: c.count || 0,
        });
      }
      return result;
    },
    enabled: !!user,
  });

  // Top contacts by lead score
  const { data: topContacts = [] } = useQuery({
    queryKey: ["top-contacts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, name, email, lead_score, status")
        .order("lead_score", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const pieData = stats ? [
    { name: "Opens", value: stats.uniqueOpens, color: "hsl(168, 80%, 36%)" },
    { name: "Clicks", value: stats.uniqueClicks, color: "hsl(210, 92%, 55%)" },
    { name: "Replies", value: stats.replies, color: "hsl(152, 69%, 40%)" },
    { name: "Bounces", value: stats.bounces, color: "hsl(0, 72%, 51%)" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Email performance and engagement metrics</p>
        </div>
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Eye} title="Open Rate" value={`${stats?.openRate || 0}%`} change={`${stats?.uniqueOpens || 0} unique opens`} changeType="positive" />
        <StatCard icon={MousePointerClick} title="Click Rate" value={`${stats?.clickRate || 0}%`} change={`${stats?.uniqueClicks || 0} unique clicks`} changeType="positive" />
        <StatCard icon={MessageSquare} title="Reply Rate" value={`${stats?.replyRate || 0}%`} change={`${stats?.replies || 0} replies`} changeType="positive" />
        <StatCard icon={AlertTriangle} title="Bounce Rate" value={`${stats?.bounceRate || 0}%`} change={`${stats?.bounces || 0} bounces`} changeType={Number(stats?.bounceRate || 0) > 5 ? "negative" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card lg:col-span-2 !p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Email Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="opensGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 92%, 55%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(210, 92%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="sent" stroke="hsl(168, 80%, 36%)" fill="url(#sentGrad)" strokeWidth={2} name="Sent" />
              <Area type="monotone" dataKey="opens" stroke="hsl(210, 92%, 55%)" fill="url(#opensGrad)" strokeWidth={2} name="Opens" />
              <Area type="monotone" dataKey="clicks" stroke="hsl(38, 92%, 50%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Clicks" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card !p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Engagement Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center mt-16">No engagement data yet. Send emails to see metrics.</p>
          )}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card !p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Top Contacts by Lead Score</h3>
        </div>
        {topContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Contact</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">Lead Score</th>
                </tr>
              </thead>
              <tbody>
                {topContacts.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{c.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "Replied" ? "bg-success/10 text-success" :
                        c.status === "Bounced" ? "bg-destructive/10 text-destructive" :
                        "bg-primary/10 text-primary"
                      }`}>{c.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${c.lead_score}%` }} />
                        </div>
                        <span className="font-mono text-foreground font-medium w-8 text-right">{c.lead_score}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No scored contacts yet. Lead scores update automatically as contacts engage with your emails.</p>
        )}
      </motion.div>
    </div>
  );
};

export default Analytics;
