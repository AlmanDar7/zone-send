import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, Webhook, Loader2 } from "lucide-react";

export const System = () => {
  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["admin-webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select(`
          *,
          webhooks (
            name,
            url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          System Health
        </h1>
        <p className="text-muted-foreground mt-1">Monitor webhook deliveries and system events.</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Recent Webhook Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Status</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Status Code</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks?.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="pl-6">
                        {delivery.success ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-none">Success</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {delivery.event_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]" title={delivery.webhooks?.url}>
                        {delivery.webhooks?.name || delivery.webhooks?.url}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-mono ${delivery.status_code === 200 ? 'text-green-500' : 'text-amber-500'}`}>
                          {delivery.status_code || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(delivery.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {webhooks?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No recent webhook deliveries.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
