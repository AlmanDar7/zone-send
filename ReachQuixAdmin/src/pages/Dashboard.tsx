import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Megaphone, Mail, Send } from "lucide-react";

export const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: userCount },
        { count: campaignCount },
        { count: contactCount },
        { count: sentEmailsCount }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("email_events").select("*", { count: "exact", head: true }).eq("event_type", "sent")
      ]);

      return {
        users: userCount || 0,
        campaigns: campaignCount || 0,
        contacts: contactCount || 0,
        sentEmails: sentEmailsCount || 0,
      };
    }
  });

  const STATS_CARDS = [
    { title: "Total Users", value: stats?.users, icon: Users, color: "text-blue-500" },
    { title: "Active Campaigns", value: stats?.campaigns, icon: Megaphone, color: "text-amber-500" },
    { title: "Total Contacts", value: stats?.contacts, icon: Mail, color: "text-purple-500" },
    { title: "Emails Sent", value: stats?.sentEmails, icon: Send, color: "text-green-500" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and high-level metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STATS_CARDS.map((stat, i) => (
          <Card key={i}>
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
