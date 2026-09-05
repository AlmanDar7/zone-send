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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Search,
  Loader2,
  Eye,
  Trash2,
  Sliders,
  Mail,
  Megaphone,
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Users = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [limitModalUser, setLimitModalUser] = useState<any | null>(null);
  const [newLimit, setNewLimit] = useState<number>(500);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => api.admin.users.list(search),
  });

  const { data: userDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin-user-details", selectedUserId],
    queryFn: () => api.admin.users.getDetails(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const updateLimitMutation = useMutation({
    mutationFn: async () => {
      if (!limitModalUser) return;
      await api.admin.users.updateLimits(limitModalUser.user_id, newLimit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-details", limitModalUser?.user_id] });
      toast.success("Daily sending quota updated!");
      setLimitModalUser(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update quota"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!deleteConfirmUser) return;
      await api.admin.users.delete(deleteConfirmUser.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("User and all associated data deleted.");
      setDeleteConfirmUser(null);
      if (selectedUserId === deleteConfirmUser?.user_id) setSelectedUserId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">User Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Search, inspect, manage daily quotas, and monitor all platform accounts.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or User ID..."
            className="pl-9 rounded-xl"
          />
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
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Sent / Queue</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>SMTP</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{user.full_name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.full_name}</p>
                          <p className="text-xs font-mono text-muted-foreground truncate max-w-[140px]" title={user.user_id}>
                            {user.user_id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm">{user.campaignCount || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm">{user.contactCount || 0}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {user.sentEmails || 0} sent
                        </p>
                        <p className="text-muted-foreground">⏳ {user.pendingEmails || 0} queued</p>
                        {user.failedEmails > 0 && (
                          <p className="text-red-500 font-medium">✕ {user.failedEmails} failed</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-xs">
                          {user.sentToday || 0} / {user.dailyLimit || 500}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Daily Limit"
                          onClick={() => {
                            setLimitModalUser(user);
                            setNewLimit(user.dailyLimit || 500);
                          }}
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.hasSmtp ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                          None
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => setSelectedUserId(user.user_id)}
                        >
                          <Eye className="h-3.5 w-3.5" /> Inspect
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Delete User Data"
                          onClick={() => setDeleteConfirmUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No users match your query.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* User Deep-Dive Inspector Sheet */}
      <Sheet open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6 space-y-6">
          <SheetHeader>
            <SheetTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              User Data Inspector
            </SheetTitle>
            <SheetDescription className="font-mono text-xs">
              User ID: {selectedUserId}
            </SheetDescription>
          </SheetHeader>

          {detailsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : userDetails ? (
            <div className="space-y-6">
              {/* User Summary Card */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={userDetails.profile?.avatar_url || ""} />
                    <AvatarFallback>{userDetails.profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{userDetails.profile?.full_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Quota: {userDetails.sendingLimit?.sent_today || 0} / {userDetails.sendingLimit?.max_per_day || 500} daily
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLimitModalUser({ user_id: selectedUserId, dailyLimit: userDetails.sendingLimit?.max_per_day || 500 });
                    setNewLimit(userDetails.sendingLimit?.max_per_day || 500);
                  }}
                >
                  <Sliders className="h-3.5 w-3.5 mr-1" /> Adjust Quota
                </Button>
              </div>

              {/* Tabs for Contacts, Campaigns, Templates, Queue, SMTP */}
              <Tabs defaultValue="campaigns" className="space-y-4">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="campaigns">Campaigns ({userDetails.campaigns?.length || 0})</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts ({userDetails.contacts?.length || 0})</TabsTrigger>
                  <TabsTrigger value="templates">Templates ({userDetails.templates?.length || 0})</TabsTrigger>
                  <TabsTrigger value="queue">Queue ({userDetails.queue?.length || 0})</TabsTrigger>
                  <TabsTrigger value="smtp">SMTP</TabsTrigger>
                </TabsList>

                {/* Campaigns Tab */}
                <TabsContent value="campaigns" className="space-y-3">
                  {userDetails.campaigns?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No campaigns created yet.</p>
                  ) : (
                    userDetails.campaigns?.map((c: any) => (
                      <div key={c.id} className="p-3 border rounded-lg bg-card flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.campaignSteps?.length || 0} step(s) • Created {format(new Date(c.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge variant="outline">{c.status}</Badge>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Contacts Tab */}
                <TabsContent value="contacts" className="space-y-3">
                  {userDetails.contacts?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No contacts added yet.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {userDetails.contacts?.map((contact: any) => (
                        <div key={contact.id} className="p-3 border rounded-lg bg-card flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{contact.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">{contact.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-3">
                  {userDetails.templates?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No templates saved.</p>
                  ) : (
                    userDetails.templates?.map((t: any) => (
                      <div key={t.id} className="p-3 border rounded-lg bg-card text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{t.name}</p>
                          <Badge variant="outline" className="capitalize">{t.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Subject: {t.subject || "—"}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Queue Tab */}
                <TabsContent value="queue" className="space-y-3">
                  {userDetails.queue?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Queue is empty.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {userDetails.queue?.map((q: any) => (
                        <div key={q.id} className="p-3 border rounded-lg bg-card text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{q.contact?.email}</span>
                            <Badge variant="outline" className="capitalize">{q.status}</Badge>
                          </div>
                          <p className="text-muted-foreground">Scheduled: {format(new Date(q.scheduled_at), "MMM d, HH:mm")}</p>
                          {q.error_message && (
                            <p className="text-red-500 font-mono text-[11px]">{q.error_message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* SMTP Tab */}
                <TabsContent value="smtp" className="space-y-3">
                  {userDetails.smtp ? (
                    <div className="p-4 border rounded-lg bg-card space-y-2 text-sm">
                      <p><strong>Host:</strong> {userDetails.smtp.host}</p>
                      <p><strong>Port:</strong> {userDetails.smtp.port}</p>
                      <p><strong>Username:</strong> {userDetails.smtp.username}</p>
                      <p><strong>Sender Name:</strong> {userDetails.smtp.from_name || "—"}</p>
                      <p><strong>Sender Email:</strong> {userDetails.smtp.from_email || "—"}</p>
                      <p><strong>SSL/TLS:</strong> {userDetails.smtp.use_ssl ? "Enabled" : "Disabled"}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">User has not configured custom SMTP.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Adjust Limit Modal */}
      <Dialog open={!!limitModalUser} onOpenChange={(open) => !open && setLimitModalUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Daily Sending Limit</DialogTitle>
            <DialogDescription>
              Set maximum daily outbound emails allowed for user{" "}
              <span className="font-mono">{limitModalUser?.user_id}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Max Emails Per Day</label>
              <Input
                type="number"
                min="10"
                max="100000"
                value={newLimit}
                onChange={(e) => setNewLimit(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Default quota is 500 emails/day.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitModalUser(null)}>Cancel</Button>
            <Button onClick={() => updateLimitMutation.mutate()} disabled={updateLimitMutation.isPending}>
              {updateLimitMutation.isPending ? "Saving..." : "Save Quota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user{" "}
              <strong>{deleteConfirmUser?.full_name}</strong> ({deleteConfirmUser?.user_id})?
              This will permanently delete all their campaigns, contacts, email templates, and sending history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmUser(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
