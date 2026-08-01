import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  Edit3,
  Copy,
  Trash2,
  MoreHorizontal,
  Mail,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";
import PageToolbar from "@/components/PageToolbar";
import ContentCard from "@/components/ContentCard";
import FormPreviewThumb from "@/components/FormPreviewThumb";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import TemplatePreview from "@/components/TemplatePreview";
import EmptyState from "@/components/EmptyState";
import { replaceTemplateVariables } from "@/lib/template-presets";
import {
  FORM_CATEGORY,
  isEmailContent,
  isFormContent,
  type ContentRow,
} from "@/lib/content-types";

export type GalleryVariant = "emails" | "forms";

type Stats = { sent: number; opens: number; clicks: number };

const galleryConfig: Record<
  GalleryVariant,
  {
    title: string;
    queryKey: string;
    newUrl: string;
    emptyIcon: LucideIcon;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction: string;
    itemLabel: string;
    duplicateToast: string;
    deleteToast: string;
    previewSubtitle: string;
    statusOptions: { value: string; label: string }[];
  }
> = {
  emails: {
    title: "My emails",
    queryKey: "emails",
    newUrl: "/templates?new=1",
    emptyIcon: Mail,
    emptyTitle: "No emails yet",
    emptyDescription:
      "Start by creating your first email. Choose from beautiful templates or design from scratch.",
    emptyAction: "Create your first email",
    itemLabel: "email",
    duplicateToast: "Email duplicated",
    deleteToast: "Email deleted",
    previewSubtitle: "Email template",
    statusOptions: [
      { value: "all", label: "All" },
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
    ],
  },
  forms: {
    title: "My forms",
    queryKey: "forms",
    newUrl: "/templates?new=1&category=form",
    emptyIcon: FileText,
    emptyTitle: "No forms yet",
    emptyDescription:
      "Create signup and lead capture forms to grow your audience and collect subscribers.",
    emptyAction: "Create your first form",
    itemLabel: "form",
    duplicateToast: "Form duplicated",
    deleteToast: "Form deleted",
    previewSubtitle: "Signup form",
    statusOptions: [
      { value: "all", label: "All" },
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
    ],
  },
};

interface ContentGalleryProps {
  variant: GalleryVariant;
}

const ContentGallery = ({ variant }: ContentGalleryProps) => {
  const config = galleryConfig[variant];
  const isForms = variant === "forms";
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState<ContentRow | null>(null);
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: [config.queryKey, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContentRow[];
    },
    enabled: !!user,
  });

  const items = useMemo(
    () => allItems.filter(isForms ? isFormContent : isEmailContent),
    [allItems, isForms],
  );

  const { data: statsByTemplate = {} } = useQuery({
    queryKey: ["content-stats", user?.id, variant],
    queryFn: async (): Promise<Record<string, Stats>> => ({}),
    enabled: !!user && !isForms,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["emails"] });
    queryClient.invalidateQueries({ queryKey: ["forms"] });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const duplicate = useMutation({
    mutationFn: async (t: ContentRow) => {
      const { error } = await supabase.from("email_templates").insert({
        user_id: user!.id,
        name: `${t.name} (Copy)`,
        subject: t.subject,
        body: t.body,
        type: t.type,
        template_format: t.template_format,
        html_body: t.html_body,
        design_config: t.design_config,
        blocks: t.blocks,
        category: isForms ? FORM_CATEGORY : t.category === FORM_CATEGORY ? "general" : t.category,
        tags: t.tags,
      } as Database["public"]["Tables"]["email_templates"]["Insert"]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(config.duplicateToast);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(config.deleteToast);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatus = (item: ContentRow) => {
    if (isForms) {
      return item.tags?.includes("published") ? "Published" : "Draft";
    }
    const stats = statsByTemplate[item.id];
    return stats?.sent ? "Sent" : "Draft";
  };

  const filtered = useMemo(() => {
    const list = items.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.subject.toLowerCase().includes(search.toLowerCase());
      const status = getStatus(item).toLowerCase();
      const matchStatus = statusFilter === "all" || statusFilter === status;
      return matchSearch && matchStatus;
    });
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, search, statusFilter, sortBy, statsByTemplate, isForms]);

  const EmptyIcon = config.emptyIcon;

  return (
    <div>
      <PageToolbar
        title={config.title}
        search={search}
        onSearchChange={setSearch}
        sortValue={sortBy}
        onSortChange={setSortBy}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={config.statusOptions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        primaryAction={{
          label: isForms ? "+ New form" : "+ New email",
          onClick: () => navigate(config.newUrl),
        }}
      />

      <div className="w-full px-4 py-8 sm:px-6 lg:px-10">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={EmptyIcon}
            title={items.length === 0 ? config.emptyTitle : "No matches"}
            description={
              items.length === 0
                ? config.emptyDescription
                : "Try adjusting your search or status filters."
            }
            actionLabel={items.length === 0 ? config.emptyAction : undefined}
            onAction={items.length === 0 ? () => navigate(config.newUrl) : undefined}
          />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "space-y-3"
            }
          >
            {filtered.map((item) => {
              const status = getStatus(item);
              const ago = formatDistanceToNow(new Date(item.updated_at || item.created_at), {
                addSuffix: false,
              });

              if (viewMode === "grid") {
                return (
                  <ContentCard
                    key={item.id}
                    title={item.name}
                    statusLabel={`${status} · last edited ${ago} ago`}
                    previewSubtitle={config.previewSubtitle}
                    previewTitle={
                      item.name.length > 24 ? `${item.name.slice(0, 24)}…` : item.name
                    }
                    preview={
                      isForms ? (
                        <FormPreviewThumb title={item.name} />
                      ) : (
                        <div className="mt-4 h-28 w-full max-w-[140px] overflow-hidden rounded-t-[999px] bg-white/95">
                          <TemplatePreview
                            html={item.html_body}
                            body={item.body}
                            scaled
                            className="h-full w-full border-0"
                          />
                        </div>
                      )
                    }
                    onClick={() => setPreviewItem(item)}
                  />
                );
              }

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-foreground">{item.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {isForms
                            ? "Lead capture · signup form"
                            : replaceTemplateVariables(item.subject)}
                        </p>
                        <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                          {status} · last edited {ago} ago
                        </span>
                      </div>
                      <ItemMenu
                        item={item}
                        isForms={isForms}
                        onPreview={() => setPreviewItem(item)}
                        onEdit={() => navigate(`/templates?edit=${item.id}`)}
                        onDuplicate={() => duplicate.mutate(item)}
                        onDelete={() => {
                          if (confirm(`Delete "${item.name}"?`)) remove.mutate(item.id);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                      {isForms ? (
                        <>
                          <Metric label="Fields" value="2" />
                          <Metric label="Status" value={status} />
                          <Metric
                            label="Created"
                            value={new Date(item.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          />
                        </>
                      ) : (
                        <>
                          <Metric
                            label="Open"
                            value={
                              statsByTemplate[item.id]?.sent
                                ? `${Math.round((statsByTemplate[item.id].opens / statsByTemplate[item.id].sent) * 100)}%`
                                : "—"
                            }
                          />
                          <Metric
                            label="Click"
                            value={
                              statsByTemplate[item.id]?.sent
                                ? `${Math.round((statsByTemplate[item.id].clicks / statsByTemplate[item.id].sent) * 100)}%`
                                : "—"
                            }
                          />
                          <Metric
                            label="Date"
                            value={new Date(item.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewItem?.name}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              {isForms ? (
                <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-border bg-muted/30 p-6">
                  <h4 className="text-center font-medium text-foreground">{previewItem.name}</h4>
                  <div className="space-y-3">
                    <div className="h-10 rounded-md border border-input bg-background" />
                    <div className="h-10 rounded-md border border-input bg-background" />
                    <Button className="w-full" type="button">
                      Subscribe
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="text-xs text-muted-foreground">Subject:</span>{" "}
                    <span className="font-medium">
                      {replaceTemplateVariables(previewItem.subject)}
                    </span>
                  </div>
                  <TemplatePreview html={previewItem.html_body} body={previewItem.body} />
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ItemMenu = ({
  item,
  isForms,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  item: ContentRow;
  isForms: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-44">
      <DropdownMenuItem onClick={onPreview}>
        <Eye className="mr-2 h-4 w-4" /> Preview
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onEdit}>
        <Edit3 className="mr-2 h-4 w-4" /> Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onDuplicate}>
        <Copy className="mr-2 h-4 w-4" /> Duplicate
      </DropdownMenuItem>
      {!isForms && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEdit}>
            <Users className="mr-2 h-4 w-4" /> Use in campaign
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default ContentGallery;
