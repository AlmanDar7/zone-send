import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Zap,
  RefreshCw,
  Database,
  Cpu,
  Server,
  HardDrive,
  Loader2,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export const System = () => {
  const queryClient = useQueryClient();
  const [purgeDays, setPurgeDays] = useState<number>(30);

  const { data: systemData, isLoading, isFetching } = useQuery({
    queryKey: ["admin-system"],
    queryFn: () => api.admin.system.getDiagnostics(),
    refetchInterval: 10000,
  });

  const triggerWorkerMutation = useMutation({
    mutationFn: () => api.admin.system.triggerWorker(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-system"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(data.message || "Queue dispatcher executed successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to trigger worker"),
  });

  const bulkRetryMutation = useMutation({
    mutationFn: () => api.admin.maintenance.bulkRetryQueue(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-system"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(data.message || "Failed emails reset to pending");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const purgeFailedMutation = useMutation({
    mutationFn: () => api.admin.maintenance.purgeFailedQueue(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-system"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(data.message || "Failed queue items purged");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const purgeEventsMutation = useMutation({
    mutationFn: () => api.admin.maintenance.purgeOldEvents(purgeDays),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-system"] });
      toast.success(data.message || "Old tracking events purged");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Activity className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            System Health & Maintenance
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time status of backend services, MySQL database, memory telemetry, and queue maintenance tools.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => triggerWorkerMutation.mutate()}
            disabled={triggerWorkerMutation.isPending}
            className="gap-2 rounded-xl shadow-sm h-10 font-semibold"
          >
            <Zap className="h-4 w-4" />
            {triggerWorkerMutation.isPending ? "Executing Dispatcher..." : "⚡ Force Dispatch Worker"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-system"] })}
            disabled={isFetching}
            className="h-10 w-10 rounded-xl shrink-0"
            title="Refresh Diagnostics"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">API Server</CardTitle>
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize text-emerald-600 dark:text-emerald-400">
                  {systemData?.status || "Online"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">HTTP Express on port 5000</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Database</CardTitle>
                <Database className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold truncate">
                  {systemData?.database || "MySQL (Connected)"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Prisma ORM Connection Active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Memory (Heap)</CardTitle>
                <Cpu className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemData?.memory?.heapUsed || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Allocated: {systemData?.memory?.heapTotal || "N/A"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Node Uptime</CardTitle>
                <Server className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemData?.uptime ? formatUptime(systemData.uptime) : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Runtime: {systemData?.nodeVersion || "Node.js"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Database Table Counts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                Database Entities Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground font-medium">Registered Users</p>
                  <p className="text-xl font-bold mt-1 text-foreground">{systemData?.counts?.profiles ?? 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground font-medium">Audience Contacts</p>
                  <p className="text-xl font-bold mt-1 text-foreground">{systemData?.counts?.contacts ?? 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground font-medium">Campaigns</p>
                  <p className="text-xl font-bold mt-1 text-foreground">{systemData?.counts?.campaigns ?? 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground font-medium">Email Templates</p>
                  <p className="text-xl font-bold mt-1 text-foreground">{systemData?.counts?.templates ?? 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground font-medium">Queue Volume</p>
                  <p className="text-xl font-bold mt-1 text-foreground">{systemData?.counts?.queue ?? 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/30 border text-center">
                  <p className="text-xs text-muted-foreground font-medium">Tracking Events</p>
                  <p className="text-xl font-bold mt-1 text-foreground">{systemData?.counts?.events ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Cleaner & Maintenance Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Database Maintenance & Cleanup Tools
              </CardTitle>
              <CardDescription>
                Execute bulk repairs, retry all failed queues, or purge stale tracking telemetry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Bulk Retry */}
                <div className="rounded-2xl border p-4 bg-muted/20 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-emerald-500" />
                      Bulk Retry Failed Queue
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reset all currently failed emails across all user accounts back to pending status.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bulkRetryMutation.mutate()}
                    disabled={bulkRetryMutation.isPending}
                    className="w-full rounded-xl"
                  >
                    {bulkRetryMutation.isPending ? "Retrying..." : "Retry All Failed"}
                  </Button>
                </div>

                {/* Purge Failed */}
                <div className="rounded-2xl border p-4 bg-muted/20 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      Purge Failed Emails
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permanently wipe all failed items from the email dispatch queue table.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete all failed queue items?")) {
                        purgeFailedMutation.mutate();
                      }
                    }}
                    disabled={purgeFailedMutation.isPending}
                    className="w-full rounded-xl"
                  >
                    {purgeFailedMutation.isPending ? "Purging..." : "Purge Failed Queue"}
                  </Button>
                </div>

                {/* Purge Old Events */}
                <div className="rounded-2xl border p-4 bg-muted/20 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Purge Stale Events
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Delete tracking opens/clicks older than:
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={purgeDays}
                        onChange={(e) => setPurgeDays(Number(e.target.value) || 30)}
                        className="h-8 rounded-lg w-20 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">Days</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete tracking events older than ${purgeDays} days?`)) {
                        purgeEventsMutation.mutate();
                      }
                    }}
                    disabled={purgeEventsMutation.isPending}
                    className="w-full rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    {purgeEventsMutation.isPending ? "Purging..." : "Purge Stale Events"}
                  </Button>
                </div>
              </div>
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
