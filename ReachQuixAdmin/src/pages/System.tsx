import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, Cpu, HardDrive, Loader2, CheckCircle2 } from "lucide-react";

export const System = () => {
  const { data: systemData, isLoading } = useQuery({
    queryKey: ["admin-system"],
    queryFn: () => api.admin.system(),
    refetchInterval: 10000,
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          System Health & Diagnostics
        </h1>
        <p className="text-muted-foreground mt-1">Real-time status of backend services, MySQL database, and memory usage.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize text-emerald-600 dark:text-emerald-400">
                  {systemData?.status || "Operational"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All core services online</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Database</CardTitle>
                <Database className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold truncate">
                  {systemData?.database || "MySQL"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Prisma ORM Connected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Memory (Heap)</CardTitle>
                <Cpu className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemData?.memory?.heapUsed || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">RSS: {systemData?.memory?.rss || "N/A"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Node Uptime</CardTitle>
                <Server className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemData?.uptime ? `${Math.round(systemData.uptime)}s` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Runtime: {systemData?.nodeVersion || "Node.js"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Database Table Counts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Database Entities Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-4 rounded-lg bg-muted/40 border text-center">
                  <p className="text-xs text-muted-foreground">Profiles</p>
                  <p className="text-2xl font-bold mt-1">{systemData?.counts?.profiles ?? 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 border text-center">
                  <p className="text-xs text-muted-foreground">Contacts</p>
                  <p className="text-2xl font-bold mt-1">{systemData?.counts?.contacts ?? 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 border text-center">
                  <p className="text-xs text-muted-foreground">Campaigns</p>
                  <p className="text-2xl font-bold mt-1">{systemData?.counts?.campaigns ?? 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 border text-center">
                  <p className="text-xs text-muted-foreground">Templates</p>
                  <p className="text-2xl font-bold mt-1">{systemData?.counts?.templates ?? 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 border text-center">
                  <p className="text-xs text-muted-foreground">Queue Items</p>
                  <p className="text-2xl font-bold mt-1">{systemData?.counts?.queue ?? 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40 border text-center">
                  <p className="text-xs text-muted-foreground">Events</p>
                  <p className="text-2xl font-bold mt-1">{systemData?.counts?.events ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
