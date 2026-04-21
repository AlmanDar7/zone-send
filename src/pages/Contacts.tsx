import { useState, useRef, useMemo } from "react";
import { Search, RefreshCw, Upload, Plus, MoreHorizontal, Trash2, Link, FileSpreadsheet, CheckSquare, Square, XCircle, FolderPlus, Folder, FolderOpen, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ContactStatus = "Active" | "Replied" | "Bounced" | "Unsubscribed" | "Completed";
const statusFilters: ("All" | ContactStatus)[] = ["All", "Active", "Replied", "Bounced", "Unsubscribed", "Completed"];

const Contacts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newCampaignId, setNewCampaignId] = useState("none");
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvCampaignId, setCsvCampaignId] = useState("none");
  const [excelCampaignId, setExcelCampaignId] = useState("none");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkCampaignId, setBulkCampaignId] = useState("none");
  const [renameContactOpen, setRenameContactOpen] = useState(false);
  const [renameContactId, setRenameContactId] = useState<string | null>(null);
  const [renameContactValue, setRenameContactValue] = useState("");

  // Folder state
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = "All Contacts"
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [addToFolderOpen, setAddToFolderOpen] = useState(false);
  const [addToFolderId, setAddToFolderId] = useState("none");

  // Queries
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, campaigns(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaign-options", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("id, name").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["contact-folders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_folders")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: folderMembers = [] } = useQuery({
    queryKey: ["contact-folder-members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_folder_members")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Derived: contact IDs in active folder
  const folderContactIds = useMemo(() => {
    if (!activeFolder) return null; // null means show all
    return new Set(
      folderMembers
        .filter((m: any) => m.folder_id === activeFolder)
        .map((m: any) => m.contact_id)
    );
  }, [activeFolder, folderMembers]);

  // Folder mutations
  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("contact_folders").insert({ user_id: user!.id, name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-folders"] });
      setCreateFolderOpen(false);
      setNewFolderName("");
      toast.success("Folder created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("contact_folders").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-folders"] });
      setRenameFolderOpen(false);
      setRenameFolderId(null);
      setRenameFolderValue("");
      toast.success("Folder renamed!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-folders"] });
      queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] });
      if (activeFolder) setActiveFolder(null);
      toast.success("Folder deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addContactsToFolder = useMutation({
    mutationFn: async ({ folderId, contactIds }: { folderId: string; contactIds: string[] }) => {
      const rows = contactIds.map((contact_id) => ({ folder_id: folderId, contact_id }));
      const { error } = await supabase.from("contact_folder_members").upsert(rows, { onConflict: "folder_id,contact_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] });
      setSelectedIds(new Set());
      setAddToFolderOpen(false);
      setAddToFolderId("none");
      toast.success("Contacts added to folder!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeFromFolder = useMutation({
    mutationFn: async ({ folderId, contactIds }: { folderId: string; contactIds: string[] }) => {
      const { error } = await supabase
        .from("contact_folder_members")
        .delete()
        .eq("folder_id", folderId)
        .in("contact_id", contactIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] });
      setSelectedIds(new Set());
      toast.success("Removed from folder");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Contact mutations (unchanged)
  const addContact = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("contacts").insert({
        user_id: user!.id,
        name: newName,
        email: newEmail,
        company_name: newCompany || null,
        campaign_id: newCampaignId === "none" ? null : newCampaignId,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // If inside a folder, auto-add to that folder
      if (activeFolder && data?.id) {
        await supabase.from("contact_folder_members").insert({ folder_id: activeFolder, contact_id: data.id });
        queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewCompany("");
      setNewCampaignId("none");
      toast.success("Contact added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const linkContactCampaign = useMutation({
    mutationFn: async ({ contactId, campaignId }: { contactId: string; campaignId: string }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ campaign_id: campaignId === "none" ? null : campaignId })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setLinkOpen(false);
      setSelectedContact(null);
      setSelectedCampaignId("none");
      toast.success("Contact campaign updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const renameContact = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("contacts").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setRenameContactOpen(false);
      setRenameContactId(null);
      setRenameContactValue("");
      toast.success("Contact name updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("contacts").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] });
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} contacts`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkAssign = useMutation({
    mutationFn: async ({ ids, campaignId }: { ids: string[]; campaignId: string }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ campaign_id: campaignId === "none" ? null : campaignId })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setSelectedIds(new Set());
      setBulkAssignOpen(false);
      setBulkCampaignId("none");
      toast.success(`Updated ${selectedIds.size} contacts`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const importCsv = useMutation({
    mutationFn: async () => {
      const lines = csvText.trim().split("\n");
      const rows = lines
        .slice(1)
        .map((line) => {
          const parts = line.split(",").map((p) => p.trim());
          return {
            user_id: user!.id,
            name: parts[0] || "",
            email: parts[1] || "",
            company_name: parts[2] || null,
            campaign_id: csvCampaignId === "none" ? null : csvCampaignId,
          };
        })
        .filter((r) => r.email);
      if (rows.length === 0) throw new Error("No valid rows found");
      const { data, error } = await supabase.from("contacts").insert(rows).select("id");
      if (error) throw error;
      // Auto-add to active folder
      if (activeFolder && data && data.length > 0) {
        const memberRows = data.map((c: any) => ({ folder_id: activeFolder, contact_id: c.id }));
        await supabase.from("contact_folder_members").insert(memberRows);
        queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] });
      }
      return data?.length || rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setCsvImportOpen(false);
      setCsvText("");
      setCsvCampaignId("none");
      toast.success(`Imported ${count} contacts!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);
      
      const rows = json
        .map((row) => {
          const name = row["Name"] || row["name"] || row["NAME"] || "";
          const email = row["Email"] || row["email"] || row["EMAIL"] || row["E-mail"] || "";
          return {
            user_id: user!.id,
            name: String(name).trim(),
            email: String(email).trim(),
            company_name: row["Company"] || row["company"] || null,
            campaign_id: excelCampaignId === "none" ? null : excelCampaignId,
            source: "excel",
          };
        })
        .filter((r) => r.email && r.name);

      if (rows.length === 0) {
        toast.error("No valid rows found. Make sure columns are named 'Name' and 'Email'.");
        return;
      }
      const { data: inserted, error } = await supabase.from("contacts").insert(rows).select("id");
      if (error) throw error;
      // Auto-add to active folder
      if (activeFolder && inserted && inserted.length > 0) {
        const memberRows = inserted.map((c: any) => ({ folder_id: activeFolder, contact_id: c.id }));
        await supabase.from("contact_folder_members").insert(memberRows);
        queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Imported ${inserted?.length || rows.length} contacts from Excel!`);
      setExcelCampaignId("none");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse Excel file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const syncGoogleSheets = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(data?.message || "Sync complete!");
    } catch (err: any) {
      toast.error(err.message || "Sync failed. Check your Google Sheet settings.");
    }
  };

  // Filter contacts by folder, search, and status
  const filtered = useMemo(() => {
    return contacts.filter((c: any) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter = activeFilter === "All" || c.status === activeFilter;
      const matchFolder = folderContactIds === null || folderContactIds.has(c.id);
      return matchSearch && matchFilter && matchFolder;
    });
  }, [contacts, search, activeFilter, folderContactIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c: any) => c.id)));
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  // Count contacts per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of folderMembers as any[]) {
      counts[m.folder_id] = (counts[m.folder_id] || 0) + 1;
    }
    return counts;
  }, [folderMembers]);

  return (
    <div className="space-y-6">
      {/* Dialogs */}
      <Dialog open={linkOpen} onOpenChange={(open) => { setLinkOpen(open); if (!open) { setSelectedContact(null); setSelectedCampaignId("none"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Assign Campaign</DialogTitle>
            <DialogDescription>Link this contact to a campaign so it can enter that sequence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedContact && <p className="text-sm text-muted-foreground">{selectedContact.name} · {selectedContact.email}</p>}
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns.map((campaign: any) => (<SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => selectedContact && linkContactCampaign.mutate({ contactId: selectedContact.id, campaignId: selectedCampaignId })} disabled={!selectedContact || linkContactCampaign.isPending}>
              {linkContactCampaign.isPending ? "Saving..." : "Save Campaign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameContactOpen}
        onOpenChange={(open) => {
          setRenameContactOpen(open);
          if (!open) {
            setRenameContactId(null);
            setRenameContactValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Rename Contact</DialogTitle>
            <DialogDescription>Change the contact name shown in your lists and campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={renameContactValue}
                onChange={(e) => setRenameContactValue(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <Button
              onClick={() => renameContactId && renameContact.mutate({ id: renameContactId, name: renameContactValue.trim() })}
              disabled={renameContact.isPending || !renameContactId || !renameContactValue.trim()}
            >
              {renameContact.isPending ? "Saving..." : "Save Name"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Create Folder</DialogTitle>
            <DialogDescription>Create a new folder to organize your contacts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input placeholder="e.g. Hot Leads" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
            </div>
            <Button onClick={() => createFolder.mutate(newFolderName)} disabled={createFolder.isPending || !newFolderName.trim()}>
              {createFolder.isPending ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Rename Folder</DialogTitle>
            <DialogDescription>Enter a new name for this folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input value={renameFolderValue} onChange={(e) => setRenameFolderValue(e.target.value)} />
            </div>
            <Button onClick={() => renameFolderId && renameFolder.mutate({ id: renameFolderId, name: renameFolderValue })} disabled={renameFolder.isPending || !renameFolderValue.trim()}>
              {renameFolder.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Folder Dialog (bulk) */}
      <Dialog open={addToFolderOpen} onOpenChange={setAddToFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add to Folder</DialogTitle>
            <DialogDescription>Add {selectedIds.size} selected contacts to a folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={addToFolderId} onValueChange={setAddToFolderId}>
              <SelectTrigger><SelectValue placeholder="Select folder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a folder...</SelectItem>
                {folders.map((f: any) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => addToFolderId !== "none" && addContactsToFolder.mutate({ folderId: addToFolderId, contactIds: Array.from(selectedIds) })}
              disabled={addToFolderId === "none" || addContactsToFolder.isPending}
            >
              {addContactsToFolder.isPending ? "Adding..." : "Add to Folder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">{contacts.length} total contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncGoogleSheets}><RefreshCw className="w-4 h-4 mr-2" />Sync Sheets</Button>
          <div className="flex items-center gap-2">
            <Select value={excelCampaignId} onValueChange={setExcelCampaignId}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Campaign (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No campaign</SelectItem>
                {campaigns.map((campaign: any) => (<SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />Upload Excel
            </Button>
          </div>
          <Dialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Import CSV</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Import CSV</DialogTitle>
                <DialogDescription>Paste CSV with columns: Name, Email, Company (optional).</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assign imported contacts to campaign (optional)</Label>
                  <Select value={csvCampaignId} onValueChange={setCsvCampaignId}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map((campaign: any) => (<SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <textarea
                  className="w-full h-40 p-3 rounded-lg border border-input bg-background text-sm font-mono resize-none"
                  placeholder={"Name,Email,Company\nJohn Doe,john@example.com,Acme Inc"}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                <Button onClick={() => importCsv.mutate()} disabled={importCsv.isPending}>
                  {importCsv.isPending ? "Importing..." : "Import"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add Contact</DialogTitle>
                <DialogDescription>
                  Add contact details and optionally link to a campaign now.
                  {activeFolder && <span className="block text-xs mt-1 text-primary">Will be added to the current folder automatically.</span>}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="john@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Company (optional)</Label>
                  <Input placeholder="Acme Inc" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Campaign (optional)</Label>
                  <Select value={newCampaignId} onValueChange={setNewCampaignId}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map((campaign: any) => (<SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => addContact.mutate()} disabled={addContact.isPending || !newName || !newEmail}>
                  {addContact.isPending ? "Adding..." : "Add Contact"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setActiveFolder(null); setSelectedIds(new Set()); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeFolder === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Folder className="w-4 h-4" />
          All Contacts
          <span className="ml-1 text-xs opacity-70">({contacts.length})</span>
        </button>
        {folders.map((folder: any) => (
          <div key={folder.id} className="flex items-center group">
            <button
              onClick={() => { setActiveFolder(folder.id); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeFolder === folder.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {activeFolder === folder.id ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              {folder.name}
              <span className="ml-1 text-xs opacity-70">({folderCounts[folder.id] || 0})</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`px-1.5 py-2 rounded-r-lg transition-colors ${
                  activeFolder === folder.id ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { setRenameFolderId(folder.id); setRenameFolderValue(folder.name); setRenameFolderOpen(true); }}>
                  <Pencil className="w-4 h-4 mr-2" />Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { if (confirm(`Delete folder "${folder.name}"? Contacts inside won't be deleted.`)) deleteFolder.mutate(folder.id); }} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />Delete folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setCreateFolderOpen(true)}>
          <FolderPlus className="w-4 h-4 mr-1" />New Folder
        </Button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {statusFilters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 flex-wrap"
        >
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            <XCircle className="w-4 h-4 mr-1" />Clear
          </Button>
          {/* Add to Folder */}
          {folders.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setAddToFolderOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-1" />Add to Folder
            </Button>
          )}
          {/* Remove from folder (only when viewing a folder) */}
          {activeFolder && (
            <Button variant="outline" size="sm" onClick={() => {
              if (confirm(`Remove ${selectedIds.size} contacts from this folder?`)) {
                removeFromFolder.mutate({ folderId: activeFolder, contactIds: Array.from(selectedIds) });
              }
            }} disabled={removeFromFolder.isPending}>
              <X className="w-4 h-4 mr-1" />{removeFromFolder.isPending ? "Removing..." : "Remove from Folder"}
            </Button>
          )}
          <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Link className="w-4 h-4 mr-1" />Assign Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Bulk Assign Campaign</DialogTitle>
                <DialogDescription>Assign {selectedIds.size} contacts to a campaign.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={bulkCampaignId} onValueChange={setBulkCampaignId}>
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No campaign</SelectItem>
                    {campaigns.map((campaign: any) => (<SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => bulkAssign.mutate({ ids: Array.from(selectedIds), campaignId: bulkCampaignId })}
                  disabled={bulkAssign.isPending}
                >
                  {bulkAssign.isPending ? "Assigning..." : "Assign All"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { if (confirm(`Delete ${selectedIds.size} contacts? This cannot be undone.`)) bulkDelete.mutate(Array.from(selectedIds)); }}
            disabled={bulkDelete.isPending}
          >
            <Trash2 className="w-4 h-4 mr-1" />{bulkDelete.isPending ? "Deleting..." : "Delete All"}
          </Button>
        </motion.div>
      )}

      {/* Contacts Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-3 px-3 w-10">
                <button onClick={toggleSelectAll} className="p-1 rounded hover:bg-muted transition-colors">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
              </th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium">Name</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium">Email</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium">Status</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium">Campaign</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium">Company</th>
              <th className="text-left py-3 px-5 text-muted-foreground font-medium">Source</th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">
                {activeFolder ? "No contacts in this folder" : "No contacts found"}
              </td></tr>
            ) : filtered.map((c: any) => (
              <tr key={c.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedIds.has(c.id) ? "bg-primary/5" : ""}`}>
                <td className="py-3 px-3">
                  <button onClick={() => toggleSelect(c.id)} className="p-1 rounded hover:bg-muted transition-colors">
                    {selectedIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </td>
                <td className="py-3 px-5 font-medium text-foreground">{c.name}</td>
                <td className="py-3 px-5 text-muted-foreground">{c.email}</td>
                <td className="py-3 px-5"><StatusBadge status={c.status as ContactStatus} /></td>
                <td className="py-3 px-5 text-muted-foreground">{c.campaigns?.name || "Unassigned"}</td>
                <td className="py-3 px-5 text-muted-foreground">{c.company_name || "—"}</td>
                <td className="py-3 px-5 text-muted-foreground capitalize">{c.source}</td>
                <td className="py-3 px-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-muted transition-colors"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setRenameContactId(c.id); setRenameContactValue(c.name || ""); setRenameContactOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" />Edit name
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedContact(c); setSelectedCampaignId(c.campaign_id || "none"); setLinkOpen(true); }}>
                        <Link className="w-4 h-4 mr-2" />Assign campaign
                      </DropdownMenuItem>
                      {folders.length > 0 && (
                        <DropdownMenuItem onClick={() => { setSelectedIds(new Set([c.id])); setAddToFolderOpen(true); }}>
                          <FolderPlus className="w-4 h-4 mr-2" />Add to folder
                        </DropdownMenuItem>
                      )}
                      {activeFolder && (
                        <DropdownMenuItem onClick={() => removeFromFolder.mutate({ folderId: activeFolder, contactIds: [c.id] })}>
                          <X className="w-4 h-4 mr-2" />Remove from folder
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => deleteContact.mutate(c.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default Contacts;
