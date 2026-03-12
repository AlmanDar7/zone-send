import { Users, Send, Mail, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";

const emailData = [
  { date: "Mon", sent: 120, replies: 8 },
  { date: "Tue", sent: 145, replies: 12 },
  { date: "Wed", sent: 98, replies: 6 },
  { date: "Thu", sent: 200, replies: 18 },
  { date: "Fri", sent: 178, replies: 14 },
  { date: "Sat", sent: 50, replies: 4 },
  { date: "Sun", sent: 30, replies: 2 },
];

const campaignData = [
  { name: "SaaS Outreach", sent: 1240, replies: 89, rate: 7.2 },
  { name: "Agency Leads", sent: 860, replies: 52, rate: 6.0 },
  { name: "E-commerce", sent: 540, replies: 41, rate: 7.6 },
];

const recentActivity = [
  { type: "reply", contact: "Sarah Chen", time: "2 min ago", detail: "Replied to SaaS Outreach" },
  { type: "sent", contact: "Mike Johnson", time: "5 min ago", detail: "Follow-up 2 sent" },
  { type: "bounce", contact: "old@invalid.com", time: "12 min ago", detail: "Hard bounce detected" },
  { type: "reply", contact: "David Kim", time: "18 min ago", detail: "Replied to Agency Leads" },
  { type: "sent", contact: "Lisa Wang", time: "25 min ago", detail: "Initial email sent" },
];

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Campaign overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Users} title="Total Contacts" value="4,832" change="+124 this week" changeType="positive" />
        <StatCard icon={Send} title="Active Campaigns" value="3" change="2 sending now" changeType="neutral" />
        <StatCard icon={Mail} title="Emails Sent Today" value="342" change="+18% vs yesterday" changeType="positive" />
        <StatCard icon={MessageSquare} title="Total Replies" value="182" change="7.2% reply rate" changeType="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card lg:col-span-2 !p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Email Activity</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={emailData}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168 80% 36%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(168 80% 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(220 9% 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220 9% 46%)" }} />
              <Tooltip />
              <Area type="monotone" dataKey="sent" stroke="hsl(168 80% 36%)" fill="url(#sentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="replies" stroke="hsl(210 92% 55%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card !p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  item.type === "reply" ? "bg-success" : item.type === "bounce" ? "bg-destructive" : "bg-primary"
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.contact}</p>
                  <p className="text-xs text-muted-foreground">{item.detail} · {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card !p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Campaign Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Campaign</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Sent</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Replies</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Reply Rate</th>
              </tr>
            </thead>
            <tbody>
              {campaignData.map((c) => (
                <tr key={c.name} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground">{c.sent.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground">{c.replies}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-success font-medium">{c.rate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
