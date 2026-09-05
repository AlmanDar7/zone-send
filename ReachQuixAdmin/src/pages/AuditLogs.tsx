import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ShieldCheck, Search, Loader2, RefreshCw, Terminal, Clock, User } from "lucide-react";

export const AuditLogs = () => {
  const [search, setSearch] = useState("");

  const { data: logs, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-audit-logs", search],
    queryFn: () => api.admin.auditLogs.list(search),
    refetchInterval: 10000,
  });

  const getActionBadge = (action: string) => {
    if (action.includes("DELETE") || action.includes("PURGE")) {
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0">{action}</Badge>;
    }
    if (action.includes("UPDATE") || action.includes("OVERRIDE")) {
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">{action}</Badge>;
    }
    if (action.includes("CREATE") || action.includes("DISPATCH") || action.includes("BROADCAST")) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">{action}</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Security & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Immutable audit trail of all administrative actions, quota modifications, security events, and deletions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action or User ID..."
              className="pl-9 rounded-xl h-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 w-10 rounded-xl shrink-0"
            title="Refresh Audit Logs"
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
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor / User ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {log.created_at ? format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss") : "—"}
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.user_id || "System"}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <pre className="text-[11px] font-mono bg-muted/40 p-2 rounded-lg overflow-x-auto max-h-24">
                        {log.details ? JSON.stringify(log.details, null, 2) : "—"}
                      </pre>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {log.ip_address || "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No audit events recorded yet.
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
