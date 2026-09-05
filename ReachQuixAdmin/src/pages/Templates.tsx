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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  FileText,
  Loader2,
  Trash2,
  Eye,
  Mail,
  FormInput,
} from "lucide-react";
import { toast } from "sonner";

export const Templates = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin-templates", categoryFilter],
    queryFn: () => api.admin.templates.list(categoryFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.templates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Template deleted");
      setPreviewTemplate(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete template"),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Template Explorer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Global catalog of all visual emails, HTML templates, and embedded forms created across the platform.
          </p>
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="email">Email Templates</option>
            <option value="form">Lead Forms</option>
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
                  <TableHead>Template Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject / Title</TableHead>
                  <TableHead>Owner User ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5 font-medium">
                        {t.category === "form" ? (
                          <FormInput className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {t.category || "email"} • {t.template_format || "visual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="text-sm font-medium truncate">{t.subject || "—"}</p>
                      {t.preview_text && (
                        <p className="text-xs text-muted-foreground truncate">{t.preview_text}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate block max-w-[140px]" title={t.user_id}>
                        {t.user_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.created_at ? format(new Date(t.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Preview Template Content"
                          onClick={() => setPreviewTemplate(t)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Delete Template"
                          onClick={() => {
                            if (window.confirm(`Delete template "${t.name}"?`)) {
                              deleteMutation.mutate(t.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {templates?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No templates found matching this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-xs space-y-1 p-3 bg-muted/40 rounded-lg">
              <p><strong>Category:</strong> {previewTemplate?.category}</p>
              <p><strong>Subject:</strong> {previewTemplate?.subject || "—"}</p>
              {previewTemplate?.preview_text && <p><strong>Preview Text:</strong> {previewTemplate?.preview_text}</p>}
            </div>

            {previewTemplate?.html_body ? (
              <div className="border rounded-lg p-4 bg-white text-black min-h-[200px]">
                <div dangerouslySetInnerHTML={{ __html: previewTemplate.html_body }} />
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-card font-mono text-xs whitespace-pre-wrap">
                {previewTemplate?.body || "No raw text body"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
