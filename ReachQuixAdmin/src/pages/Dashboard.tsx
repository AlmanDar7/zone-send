import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Megaphone, Mail, Send, Clock, PlayCircle } from "lucide-react";

export const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.admin.stats(),
    refetchInterval: 15000,
  });

  const STATS_CARDS = [
    { title: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Campaigns", value: stats?.totalCampaigns, icon: Megaphone, color: "text-amber-500" },
    { title: "Active Campaigns", value: stats?.activeCampaigns, icon: PlayCircle, color: "text-emerald-500" },
    { title: "Total Contacts", value: stats?.totalContacts, icon: Mail, color: "text-purple-500" },
    { title: "Emails Sent", value: stats?.totalEmailsSent, icon: Send, color: "text-green-500" },
    { title: "Pending Queue", value: stats?.pendingQueue, icon: Clock, color: "text-orange-500" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and high-level metrics across all tenants.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STATS_CARDS.map((stat, i) => (
          <Card key={i} className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stat.value !== undefined ? stat.value.toLocaleString() : "..."}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
