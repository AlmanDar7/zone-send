import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Megaphone,
  Mail,
  Send,
  Clock,
  PlayCircle,
  AlertTriangle,
  FileText,
  Zap,
  RefreshCw,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export const Dashboard = () => {
  const queryClient = useQueryClient();

  const { data: stats, isFetching: statsFetching } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.admin.stats(),
    refetchInterval: 10000,
  });

  const { data: system } = useQuery({
    queryKey: ["admin-system"],
    queryFn: () => api.admin.system.getDiagnostics(),
    refetchInterval: 15000,
  });

  const triggerWorker = useMutation({
    mutationFn: () => api.admin.system.triggerWorker(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(data.message || "Queue dispatcher executed!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const STATS_CARDS = [
    { title: "Registered Users", value: stats?.totalUsers, icon: Users, color: "from-blue-500 to-indigo-600", text: "text-blue-500" },
    { title: "Total Contacts", value: stats?.totalContacts, icon: Mail, color: "from-purple-500 to-fuchsia-600", text: "text-purple-500" },
    { title: "Total Campaigns", value: stats?.totalCampaigns, icon: Megaphone, color: "from-amber-500 to-orange-600", text: "text-amber-500" },
    { title: "Active Campaigns", value: stats?.activeCampaigns, icon: PlayCircle, color: "from-emerald-500 to-green-600", text: "text-emerald-500" },
    { title: "Emails Sent", value: stats?.totalEmailsSent, icon: Send, color: "from-green-500 to-emerald-600", text: "text-green-500" },
    { title: "Pending Queue", value: stats?.pendingQueue, icon: Clock, color: "from-orange-500 to-amber-600", text: "text-orange-500" },
    { title: "Failed Emails", value: stats?.failedQueue, icon: AlertTriangle, color: "from-red-500 to-rose-600", text: "text-red-500" },
    { title: "Templates", value: stats?.totalTemplates, icon: FileText, color: "from-cyan-500 to-teal-600", text: "text-cyan-500" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Activity className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Command Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Live platform metrics, queue telemetry, and system operations.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => triggerWorker.mutate()}
            disabled={triggerWorker.isPending}
            className="gap-2 rounded-xl shadow-sm h-9 text-xs sm:text-sm"
            size="sm"
          >
            <Zap className="h-4 w-4" />
            {triggerWorker.isPending ? "Dispatching..." : "Force Dispatch"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
              queryClient.invalidateQueries({ queryKey: ["admin-system"] });
            }}
            disabled={statsFetching}
            className="h-9 w-9 rounded-xl shrink-0"
            title="Refresh All Stats"
          >
            <RefreshCw className={`h-4 w-4 ${statsFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {STATS_CARDS.map((stat, i) => (
          <Card key={i} className="group hover:border-primary/30 transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                {stat.value !== undefined ? stat.value.toLocaleString() : "—"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Status Row */}
      {system && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground font-medium">API Server</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-base sm:text-lg font-bold capitalize text-emerald-600 dark:text-emerald-400">
                  {system.status}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground font-medium">Database</p>
              <p className="text-base sm:text-lg font-bold mt-1 truncate">{system.database}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground font-medium">Heap Memory</p>
              <p className="text-base sm:text-lg font-bold mt-1">{system.memory?.heapUsed} / {system.memory?.heapTotal}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground font-medium">Server Uptime</p>
              <p className="text-base sm:text-lg font-bold mt-1">
                {system.uptime ? formatUptime(system.uptime) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
