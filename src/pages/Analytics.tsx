import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, MousePointerClick, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Analytics = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCampaign, setSelectedCampaign] = useState<string>(
    () => searchParams.get("campaign") || "all",
  );

  useEffect(() => {
    const campaignFromUrl = searchParams.get("campaign");
    if (campaignFromUrl) {
      setSelectedCampaign(campaignFromUrl);
    }
  }, [searchParams]);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaign(value);
    if (value === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ campaign: value });
    }
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("analytics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["analytics-stats"] });
        queryClient.invalidateQueries({ queryKey: ["analytics-daily"] });
        queryClient.invalidateQueries({ queryKey: ["top-contacts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "email_queue" }, () => {
        queryClient.invalidateQueries({ queryKey: ["analytics-stats"] });
        queryClient.invalidateQueries({ queryKey: ["analytics-daily"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-analytics", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const selectedCampaignName =
    selectedCampaign === "all"
      ? null
      : campaigns.find((c: { id: string }) => c.id === selectedCampaign)?.name;

  const { data: stats } = useQuery({
    queryKey: ["analytics-stats", user?.id, selectedCampaign],
    queryFn: async () => {
      let sentQuery = supabase
        .from("email_queue")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "sent");
      let eventsQuery = supabase.from("email_events").select("*").eq("user_id", user!.id);
      let repliedQuery = supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "Replied");
      let bouncedQuery = supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "Bounced");

      if (selectedCampaign !== "all") {
        sentQuery = sentQuery.eq("campaign_id", selectedCampaign);
        eventsQuery = eventsQuery.eq("campaign_id", selectedCampaign);
        repliedQuery = repliedQuery.eq("campaign_id", selectedCampaign);
        bouncedQuery = bouncedQuery.eq("campaign_id", selectedCampaign);
      }

      const [sentRes, eventsRes, repliedRes, bouncedRes] = await Promise.all([
        sentQuery,
        eventsQuery,
        repliedQuery,
        bouncedQuery,
      ]);

      const events = eventsRes.data || [];
      const opens = events.filter((e) => e.event_type === "open");
      const clicks = events.filter((e) => e.event_type === "click");
      const uniqueOpens = new Set(opens.map((e) => e.contact_id)).size;
      const uniqueClicks = new Set(clicks.map((e) => e.contact_id)).size;
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

        let sentQ = supabase
          .from("email_queue")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "sent")
          .gte("sent_at", dayStr)
          .lt("sent_at", nextDayStr);
        let opensQ = supabase
          .from("email_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("event_type", "open")
          .gte("created_at", dayStr)
          .lt("created_at", nextDayStr);
        let clicksQ = supabase
          .from("email_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("event_type", "click")
          .gte("created_at", dayStr)
          .lt("created_at", nextDayStr);

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

  const { data: growthData = [] } = useQuery({
    queryKey: ["analytics-growth", user?.id, selectedCampaign],
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

        let query = supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .gte("created_at", dayStr)
          .lt("created_at", nextDayStr);

        if (selectedCampaign !== "all") {
          query = query.eq("campaign_id", selectedCampaign);
        }

        const res = await query;
        result.push({
          date: date.toLocaleDateString("en", { weekday: "short" }),
          subscribers: res.count || 0,
        });
      }
      return result;
    },
    enabled: !!user,
  });

  const { data: topContacts = [] } = useQuery({
    queryKey: ["top-contacts", user?.id, selectedCampaign],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("id, name, email, lead_score, status")
        .eq("user_id", user!.id)
        .order("lead_score", { ascending: false })
        .limit(10);

      if (selectedCampaign !== "all") {
        query = query.eq("campaign_id", selectedCampaign);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const pieData = stats
    ? [
        { name: "Opens", value: stats.uniqueOpens, color: "hsl(158, 64%, 32%)" },
        { name: "Clicks", value: stats.uniqueClicks, color: "hsl(158, 45%, 50%)" },
        { name: "Replies", value: stats.replies, color: "hsl(152, 55%, 40%)" },
        { name: "Bounces", value: stats.bounces, color: "hsl(0, 72%, 51%)" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <div className="border-b border-border bg-card">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCampaignName
                ? `Performance for ${selectedCampaignName}`
                : "Email performance and engagement metrics"}
            </p>
          </div>
          <Select value={selectedCampaign} onValueChange={handleCampaignChange}>
            <SelectTrigger className="h-9 w-[220px] border border-border bg-background">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((c: { id: string; name: string }) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-10">
        {selectedCampaign !== "all" && stats?.totalSent === 0 && (
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            No sent emails recorded for this campaign yet. Metrics will appear after emails are sent from
            the workflow.
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Eye}
            title="Open Rate"
            value={`${stats?.openRate || 0}%`}
            change={`${stats?.uniqueOpens || 0} unique opens · ${stats?.totalSent || 0} sent`}
            changeType="positive"
          />
          <StatCard
            icon={MousePointerClick}
            title="Click Rate"
            value={`${stats?.clickRate || 0}%`}
            change={`${stats?.uniqueClicks || 0} unique clicks`}
            changeType="positive"
          />
          <StatCard
            icon={MessageSquare}
            title="Reply Rate"
            value={`${stats?.replyRate || 0}%`}
            change={`${stats?.replies || 0} replies`}
            changeType="positive"
          />
          <StatCard
            icon={AlertTriangle}
            title="Bounce Rate"
            value={`${stats?.bounceRate || 0}%`}
            change={`${stats?.bounces || 0} bounces`}
            changeType={Number(stats?.bounceRate || 0) > 5 ? "negative" : "neutral"}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card lg:col-span-2 !p-5"
          >
            <h3 className="mb-4 font-display font-semibold text-foreground">
              Email Activity (Last 7 Days)
              {selectedCampaignName ? ` — ${selectedCampaignName}` : ""}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="sentGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(158, 64%, 32%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(158, 64%, 32%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="opensGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210, 92%, 55%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(210, 92%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 91%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="hsl(158, 64%, 32%)"
                  fill="url(#sentGradA)"
                  strokeWidth={2}
                  name="Sent"
                />
                <Area
                  type="monotone"
                  dataKey="opens"
                  stroke="hsl(210, 92%, 55%)"
                  fill="url(#opensGradA)"
                  strokeWidth={2}
                  name="Opens"
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="hsl(38, 92%, 50%)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  name="Clicks"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="stat-card !p-5"
          >
            <h3 className="mb-4 font-display font-semibold text-foreground">Engagement Breakdown</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="mt-16 text-center text-sm text-muted-foreground">
                No engagement data yet. Send emails to see metrics.
              </p>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground">
                    {d.name}: {d.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="stat-card !p-5"
        >
          <h3 className="mb-4 font-display font-semibold text-foreground">
            Subscriber Growth (Last 7 Days)
            {selectedCampaignName ? ` — ${selectedCampaignName}` : ""}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 92%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(210, 92%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(220, 13%, 91%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="subscribers"
                stroke="hsl(210, 92%, 55%)"
                fill="url(#growthGrad)"
                strokeWidth={2}
                name="New Subscribers"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card !p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              Top Contacts by Lead Score
              {selectedCampaignName ? ` (${selectedCampaignName})` : ""}
            </h3>
          </div>
          {topContacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Lead Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topContacts.map((c: { id: string; name: string; email: string; status: string; lead_score: number }) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            c.status === "Replied"
                              ? "bg-success/10 text-success"
                              : c.status === "Bounced"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${c.lead_score}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-mono font-medium text-foreground">
                            {c.lead_score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedCampaign !== "all"
                ? "No contacts in this campaign yet."
                : "No scored contacts yet. Lead scores update automatically as contacts engage with your emails."}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
