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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search, Loader2, Trash2, Download, Users, Mail, Building } from "lucide-react";
import { toast } from "sonner";

export const Contacts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["admin-contacts", search],
    queryFn: () => api.admin.contacts.list(search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.contacts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Contact deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete contact"),
  });

  const exportContacts = () => {
    if (!contacts || contacts.length === 0) {
      toast.info("No contacts to export");
      return;
    }
    const headers = "Name,Email,Company,Phone,Status,Owner_User_ID,Created_At\n";
    const rows = contacts
      .map((c: any) =>
        `"${c.name || ""}",` +
        `"${c.email || ""}",` +
        `"${c.company_name || ""}",` +
        `"${c.phone || ""}",` +
        `"${c.status || "active"}",` +
        `"${c.user_id}",` +
        `"${c.created_at || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reachquix-all-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported all contacts to CSV!");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Global Contacts Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Search, inspect, and export all audience contacts across all user accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company, or User ID..."
              className="pl-9 rounded-xl"
            />
          </div>
          <Button variant="outline" onClick={exportContacts} className="gap-2 shrink-0 rounded-xl">
            <Download className="h-4 w-4" /> Export CSV
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
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags & Lists</TableHead>
                  <TableHead>Owner User ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts?.map((contact: any) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground">{contact.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{contact.email}</p>
                        {contact.phone && <p className="text-[11px] text-muted-foreground">{contact.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.company_name ? (
                        <span className="text-sm font-medium flex items-center gap-1.5 text-foreground">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          {contact.company_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {contact.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {contact.tags?.map((t: any) => (
                          <Badge key={t.tag_id} variant="outline" className="text-[10px] px-1.5 py-0">
                            #{t.tag?.name}
                          </Badge>
                        ))}
                        {contact.folder_members?.map((f: any) => (
                          <Badge key={f.folder_id} variant="secondary" className="text-[10px] px-1.5 py-0">
                            📁 {f.folder?.name}
                          </Badge>
                        ))}
                        {(!contact.tags?.length && !contact.folder_members?.length) && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate block max-w-[140px]" title={contact.user_id}>
                        {contact.user_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {contact.created_at ? format(new Date(contact.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Delete Contact"
                        onClick={() => {
                          if (window.confirm(`Delete contact ${contact.email}?`)) {
                            deleteMutation.mutate(contact.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {contacts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No contacts found matching your query.
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
