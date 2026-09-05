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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  Search,
  Loader2,
  Megaphone,
  Pause,
  Play,
  Trash2,
  Eye,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export const Campaigns = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inspectCampaign, setInspectCampaign] = useState<any | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: () => api.admin.campaigns.list(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.admin.campaigns.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Campaign status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update campaign status"),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => api.admin.campaigns.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Campaign deleted");
      setInspectCampaign(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete campaign"),
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">Running</Badge>;
      case "paused":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">Paused</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredCampaigns = campaigns?.filter((c: any) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Megaphone className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Global Campaign Controller
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Monitor, pause/resume, inspect sequence steps, and manage all outreach campaigns across all accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="pl-9 rounded-xl"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="Running">Running</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
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
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Owner User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Sent / Queue</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Admin Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns?.map((campaign: any) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <span className="font-semibold text-foreground">{campaign.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate block max-w-[140px]" title={campaign.user_id}>
                        {campaign.user_id}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {campaign.stepCount || 1} step(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {campaign.sentTotal || 0}
                        </span>{" "}
                        / <span>{campaign.queueTotal || 0}</span>
                        {campaign.failedTotal > 0 && (
                          <span className="text-red-500 ml-1">({campaign.failedTotal} failed)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {campaign.daily_limit || 500}/day
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {campaign.created_at ? format(new Date(campaign.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {campaign.status.toLowerCase() === "running" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-500/10"
                            title="Pause Campaign"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "paused" })}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                            title="Resume Campaign"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "Running" })}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Inspect Steps"
                          onClick={() => setInspectCampaign(campaign)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Delete Campaign"
                          onClick={() => {
                            if (window.confirm(`Delete campaign "${campaign.name}"?`)) {
                              deleteCampaignMutation.mutate(campaign.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCampaigns?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Inspect Steps Dialog */}
      <Dialog open={!!inspectCampaign} onOpenChange={(open) => !open && setInspectCampaign(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Campaign Steps: {inspectCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {inspectCampaign?.steps?.map((step: any, index: number) => (
              <div key={step.id} className="p-3 border rounded-xl bg-card space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">Step {step.step_number || index + 1}</span>
                  <Badge variant="outline">
                    Delay: {step.delay_value || step.delay_days || 0} {step.delay_unit || "days"}
                  </Badge>
                </div>
                <p className="text-xs text-foreground font-medium">Subject: {step.subject_a || step.template?.name || "—"}</p>
                {step.preview_text_a && (
                  <p className="text-xs text-muted-foreground">Preview: {step.preview_text_a}</p>
                )}
              </div>
            ))}
            {(!inspectCampaign?.steps || inspectCampaign?.steps.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-4">No sequence steps defined for this campaign.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
