import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Queue = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: queueItems, isLoading, isFetching } = useQuery({
    queryKey: ["admin-queue", statusFilter],
    queryFn: () => api.admin.queue.list(statusFilter),
    refetchInterval: 10000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.admin.queue.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Queued email reset for immediate retry");
    },
    onError: (err: any) => toast.error(err.message || "Failed to retry email"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.queue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Email removed from queue");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete queue item"),
  });

  const triggerWorkerMutation = useMutation({
    mutationFn: () => api.admin.system.triggerWorker(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(data.message || "Worker executed successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to trigger worker"),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">Sent</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Send className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Global Email Dispatch Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time telemetry of all outgoing, pending, and failed emails across all accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <Button
            onClick={() => triggerWorkerMutation.mutate()}
            disabled={triggerWorkerMutation.isPending}
            className="gap-2 rounded-xl"
          >
            <Zap className="h-4 w-4" />
            {triggerWorkerMutation.isPending ? "Executing..." : "Force Dispatch Now"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-queue"] })}
            disabled={isFetching}
            className="h-10 w-10 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Owner User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled / Dispatched</TableHead>
                  <TableHead>Error Diagnostics</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">{item.contact?.email || "—"}</p>
                        {item.contact?.name && (
                          <p className="text-xs text-muted-foreground">{item.contact.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm text-foreground">
                        {item.campaign?.name || "Sequence"} (Step {item.step_number || 1})
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate block max-w-[140px]" title={item.user_id}>
                        {item.user_id}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.scheduled_at ? format(new Date(item.scheduled_at), "MMM d, HH:mm:ss") : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {item.error_message ? (
                        <p className="text-xs text-red-500 font-mono truncate" title={item.error_message}>
                          {item.error_message}
                        </p>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            title="Retry Email"
                            onClick={() => retryMutation.mutate(item.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Remove from Queue"
                          onClick={() => {
                            if (window.confirm("Remove this email from dispatch queue?")) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {queueItems?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No emails in the dispatch queue matching this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
