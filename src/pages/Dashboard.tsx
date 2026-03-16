import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Send, Mail, MessageSquare, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user } = useAuth();

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
      const { count } = await supabase.from("email_queue").select("*", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", today);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: replies } = useQuery({
    queryKey: ["replies-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("contacts").select("*", { count: "exact", head: true }).eq("status", "Replied");
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: recentContacts } = useQuery({
    queryKey: ["recent-contacts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").order("updated_at", { ascending: false }).limit(5);
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

  const emailData = [
    { date: "Mon", sent: 0, replies: 0 },
    { date: "Tue", sent: 0, replies: 0 },
    { date: "Wed", sent: 0, replies: 0 },
    { date: "Thu", sent: 0, replies: 0 },
    { date: "Fri", sent: 0, replies: 0 },
    { date: "Sat", sent: 0, replies: 0 },
    { date: "Sun", sent: 0, replies: 0 },
  ];

  const statCards = [
    { icon: Users, title: "Total Contacts", value: contacts?.toLocaleString() || "0", gradient: "bg-primary/10" },
    { icon: Send, title: "Active Campaigns", value: campaigns?.length || 0, gradient: "bg-accent/10" },
    { icon: Mail, title: "Emails Today", value: emailsSentToday || 0, gradient: "bg-info/10" },
    { icon: MessageSquare, title: "Total Replies", value: replies || 0, gradient: "bg-success/10" },
  ];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Campaign overview and analytics</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard icon={card.icon} title={card.title} value={card.value} gradient={card.gradient} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card lg:col-span-2 !p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-foreground text-sm">Email Activity</h3>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Sent</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-info" /> Replies</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={emailData}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215, 12%, 52%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 12%, 52%)" }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  background: "hsl(225, 15%, 13%)", 
                  border: "1px solid hsl(225, 12%, 20%)", 
                  borderRadius: "12px", 
                  fontSize: "12px",
                  color: "hsl(210, 20%, 95%)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
                }} 
              />
              <Area type="monotone" dataKey="sent" stroke="hsl(172, 66%, 50%)" fill="url(#sentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="replies" stroke="hsl(210, 92%, 58%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card !p-5">
          <h3 className="font-display font-bold text-foreground text-sm mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentContacts && recentContacts.length > 0 ? recentContacts.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  c.status === "Replied" ? "bg-success" : c.status === "Bounced" ? "bg-destructive" : "bg-primary"
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.status} · {c.email}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No contacts yet. Add contacts to get started.</p>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card !p-0 overflow-hidden">
        <div className="p-5 pb-4">
          <h3 className="font-display font-bold text-foreground text-sm">Campaigns</h3>
        </div>
        {campaignList && campaignList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-white/[0.06]">
                  <th className="text-left py-3 px-5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Campaign</th>
                  <th className="text-left py-3 px-5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Daily Limit</th>
                  <th className="text-right py-3 px-5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaignList.map((c) => (
                  <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-5 font-semibold text-foreground">{c.name}</td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                        c.status === "Running" ? "bg-success/15 text-success border border-success/20" :
                        c.status === "Paused" ? "bg-warning/15 text-warning border border-warning/20" :
                        "bg-muted text-muted-foreground border border-white/[0.06]"
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right text-muted-foreground font-medium">{c.daily_limit}</td>
                    <td className="py-3 px-5 text-right text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <p className="text-sm text-muted-foreground">No campaigns yet. Create one to start sending emails.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
