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
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export const Users = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          sending_limits (
            sent_today,
            max_per_day
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Manage all registered users on the platform.</p>
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
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Sending Limit</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => {
                  const limits = Array.isArray(user.sending_limits) 
                    ? user.sending_limits[0] 
                    : user.sending_limits;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || ""} />
                            <AvatarFallback>{user.full_name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {limits ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {limits.sent_today} / {limits.max_per_day}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No limit record</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {user.user_id}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
