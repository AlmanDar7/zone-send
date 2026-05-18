import { ReactNode } from "react";
import { Search, ChevronDown, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

interface PageToolbarProps {
  title: string;
  foldersLabel?: string;
  onFoldersClick?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: { value: string; label: string }[];
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: { value: string; label: string }[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewToggle?: boolean;
  primaryAction?: { label: string; onClick: () => void };
  extraActions?: ReactNode;
}

const PageToolbar = ({
  title,
  foldersLabel = "Folders",
  onFoldersClick,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  sortValue,
  onSortChange,
  sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name", label: "Name" },
  ],
  statusValue,
  onStatusChange,
  statusOptions = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
  ],
  viewMode = "grid",
  onViewModeChange,
  showViewToggle = true,
  primaryAction,
  extraActions,
}: PageToolbarProps) => (
  <div className="border-b border-border bg-card">
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {onFoldersClick && (
            <button
              type="button"
              onClick={onFoldersClick}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {foldersLabel}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {onSearchChange !== undefined && (
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-36 border-0 bg-transparent pl-6 text-sm shadow-none focus-visible:ring-0 lg:w-44"
              />
            </div>
          )}

          {onSortChange && sortValue !== undefined && (
            <Select value={sortValue} onValueChange={onSortChange}>
              <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none focus:ring-0">
                <span>Sort</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {onStatusChange && statusValue !== undefined && (
            <Select value={statusValue} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none focus:ring-0">
                <span>Status</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showViewToggle && onViewModeChange && (
            <div className="hidden items-center rounded-md bg-muted p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => onViewModeChange("grid")}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded",
                  viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded",
                  viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {extraActions}

          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {onSearchChange !== undefined && (
        <div className="relative sm:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 rounded-md border-border bg-background pl-9 text-sm"
          />
        </div>
      )}
    </div>
  </div>
);

export default PageToolbar;
