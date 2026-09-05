import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, MousePointerClick, UserX, Activity, RefreshCw, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

export const Events = () => {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: events, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-events", typeFilter],
    queryFn: () => api.admin.events.list(typeFilter),
    refetchInterval: 8000,
  });

  const getEventBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "open":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0 gap-1 font-semibold">
            <Eye className="h-3 w-3" /> Open
          </Badge>
        );
      case "click":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 gap-1 font-semibold">
            <MousePointerClick className="h-3 w-3" /> Click
          </Badge>
        );
      case "unsubscribe":
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0 gap-1 font-semibold">
            <UserX className="h-3 w-3" /> Opt-Out
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const exportEvents = () => {
    if (!events || events.length === 0) {
      toast.info("No events to export");
      return;
    }
    const headers = "Timestamp,Event_Type,Recipient_Email,Recipient_Name,Campaign,Link_URL,IP_Address,User_ID\n";
    const rows = events
      .map((e: any) =>
        `"${e.created_at || ""}",` +
        `"${e.event_type || ""}",` +
        `"${e.contact?.email || ""}",` +
        `"${e.contact?.name || ""}",` +
        `"${e.campaign?.name || ""}",` +
        `"${e.link_url || ""}",` +
        `"${e.ip_address || ""}",` +
        `"${e.user_id || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reachquix-tracking-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tracking telemetry exported to CSV!");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Activity className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Global Tracking Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time feed of all recipient engagement events (email opens, link clicks, and opt-outs) across all campaigns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Events</option>
            <option value="open">Opens</option>
            <option value="click">Clicks</option>
            <option value="unsubscribe">Unsubscribes</option>
          </select>
          <Button variant="outline" onClick={exportEvents} className="gap-2 rounded-xl h-10">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 w-10 rounded-xl shrink-0"
            title="Refresh Events"
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
                  <TableHead className="w-[170px]">Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Target Link / Info</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events?.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {e.created_at ? format(new Date(e.created_at), "MMM d, yyyy HH:mm:ss") : "—"}
                    </TableCell>
                    <TableCell>{getEventBadge(e.event_type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-xs text-foreground">{e.contact?.email || "—"}</p>
                        {e.contact?.name && <p className="text-[11px] text-muted-foreground">{e.contact.name}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {e.campaign?.name || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs font-mono text-muted-foreground" title={e.link_url || ""}>
                      {e.link_url || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {e.ip_address || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[120px]" title={e.user_id}>
                      {e.user_id}
                    </TableCell>
                  </TableRow>
                ))}
                {(!events || events.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No tracking events recorded yet.
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
