import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Send, Mail, MessageSquare, Eye, MousePointerClick, Plus, Megaphone, UserPlus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      return await api.dashboard.stats();
    },
    enabled: !!user,
    refetchInterval: 10000 // Poll every 10 seconds since we removed Realtime
  });

  const contactsCount = stats?.contactsCount || 0;
  const campaigns = stats?.activeCampaigns || [];
  const emailsSentToday = stats?.emailsSentToday || 0;
  const replies = stats?.repliesCount || 0;
  const engagementStats = stats?.engagement || { totalSent: 0, uniqueOpens: 0, uniqueClicks: 0, openRate: "0", clickRate: "0" };
  const recentContacts = stats?.recentContacts || [];
  const campaignList = stats?.campaignList || [];
  const emailData = stats?.chartData || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-2rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border bg-card px-4 py-6 sm:px-6 lg:px-10">
        <div className="w-full">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Campaign overview and analytics</p>
        </div>
      </div>
      <div className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-10">

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Plus, label: "Create Email", desc: "Design a new email template", path: "/emails/templates" },
          { icon: Megaphone, label: "New Campaign", desc: "Send to your audience", path: "/campaigns/new" },
          { icon: UserPlus, label: "Add Contacts", desc: "Grow your audience", path: "/contacts" },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <action.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard icon={Users} title="Total Contacts" value={contactsCount.toLocaleString()} />
        <StatCard icon={Send} title="Active Campaigns" value={campaigns?.length || 0} />
        <StatCard icon={Mail} title="Emails Sent Today" value={emailsSentToday.toLocaleString()} />
        <StatCard icon={Eye} title="Open Rate" value={`${engagementStats?.openRate || 0}%`} change={`${engagementStats?.uniqueOpens || 0} unique opens`} changeType="positive" />
        <StatCard icon={MousePointerClick} title="Click Rate" value={`${engagementStats?.clickRate || 0}%`} change={`${engagementStats?.uniqueClicks || 0} unique clicks`} changeType="positive" />
        <StatCard icon={MessageSquare} title="Total Replies" value={replies || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card lg:col-span-2 !p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Email Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={emailData}>
              <defs>
                <linearGradient id="sentGradD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(158, 64%, 32%)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(158, 64%, 32%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="sent" stroke="hsl(158, 64%, 32%)" fill="url(#sentGradD)" strokeWidth={2} name="Sent" />
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
                        c.status === "Scheduled" ? "bg-info/10 text-info" :
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
    </div>
  );
};

export default Dashboard;
