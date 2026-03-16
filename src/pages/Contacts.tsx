import { useState, useRef, useMemo } from "react";
import { Search, RefreshCw, Upload, Plus, MoreHorizontal, Trash2, Link, FileSpreadsheet, CheckSquare, Square, XCircle, FolderPlus, Folder, FolderOpen, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [addToFolderOpen, setAddToFolderOpen] = useState(false);
  const [addToFolderId, setAddToFolderId] = useState("none");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*, campaigns(name)").order("created_at", { ascending: false });
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
      const { data, error } = await supabase.from("contact_folders").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: folderMembers = [] } = useQuery({
    queryKey: ["contact-folder-members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_folder_members").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const folderContactIds = useMemo(() => {
    if (!activeFolder) return null;
    return new Set(folderMembers.filter((m: any) => m.folder_id === activeFolder).map((m: any) => m.contact_id));
  }, [activeFolder, folderMembers]);

  // Folder mutations
  const createFolder = useMutation({
    mutationFn: async (name: string) => { const { error } = await supabase.from("contact_folders").insert({ user_id: user!.id, name }); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contact-folders"] }); setCreateFolderOpen(false); setNewFolderName(""); toast.success("Folder created!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => { const { error } = await supabase.from("contact_folders").update({ name }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contact-folders"] }); setRenameFolderOpen(false); setRenameFolderId(null); setRenameFolderValue(""); toast.success("Folder renamed!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contact_folders").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contact-folders"] }); queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] }); if (activeFolder) setActiveFolder(null); toast.success("Folder deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  const addContactsToFolder = useMutation({
    mutationFn: async ({ folderId, contactIds }: { folderId: string; contactIds: string[] }) => {
      const rows = contactIds.map((contact_id) => ({ folder_id: folderId, contact_id }));
      const { error } = await supabase.from("contact_folder_members").upsert(rows, { onConflict: "folder_id,contact_id" });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] }); setSelectedIds(new Set()); setAddToFolderOpen(false); setAddToFolderId("none"); toast.success("Contacts added to folder!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const removeFromFolder = useMutation({
    mutationFn: async ({ folderId, contactIds }: { folderId: string; contactIds: string[] }) => {
      const { error } = await supabase.from("contact_folder_members").delete().eq("folder_id", folderId).in("contact_id", contactIds);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] }); setSelectedIds(new Set()); toast.success("Removed from folder"); },
    onError: (err: any) => toast.error(err.message),
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("contacts").insert({ user_id: user!.id, name: newName, email: newEmail, company_name: newCompany || null, campaign_id: newCampaignId === "none" ? null : newCampaignId }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (activeFolder && data?.id) { await supabase.from("contact_folder_members").insert({ folder_id: activeFolder, contact_id: data.id }); queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] }); }
      queryClient.invalidateQueries({ queryKey: ["contacts"] }); setAddOpen(false); setNewName(""); setNewEmail(""); setNewCompany(""); setNewCampaignId("none"); toast.success("Contact added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const linkContactCampaign = useMutation({
    mutationFn: async ({ contactId, campaignId }: { contactId: string; campaignId: string }) => {
      const { error } = await supabase.from("contacts").update({ campaign_id: campaignId === "none" ? null : campaignId }).eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setLinkOpen(false); setSelectedContact(null); setSelectedCampaignId("none"); toast.success("Contact campaign updated!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contacts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); toast.success("Contact deleted"); },
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => { const { error } = await supabase.from("contacts").delete().in("id", ids); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] }); setSelectedIds(new Set()); toast.success(`Deleted ${selectedIds.size} contacts`); },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkAssign = useMutation({
    mutationFn: async ({ ids, campaignId }: { ids: string[]; campaignId: string }) => {
      const { error } = await supabase.from("contacts").update({ campaign_id: campaignId === "none" ? null : campaignId }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setSelectedIds(new Set()); setBulkAssignOpen(false); setBulkCampaignId("none"); toast.success(`Updated ${selectedIds.size} contacts`); },
    onError: (err: any) => toast.error(err.message),
  });

  const importCsv = useMutation({
    mutationFn: async () => {
      const lines = csvText.trim().split("\n");
      const rows = lines.slice(1).map((line) => { const parts = line.split(",").map((p) => p.trim()); return { user_id: user!.id, name: parts[0] || "", email: parts[1] || "", company_name: parts[2] || null, campaign_id: csvCampaignId === "none" ? null : csvCampaignId }; }).filter((r) => r.email);
      if (rows.length === 0) throw new Error("No valid rows found");
      const { data, error } = await supabase.from("contacts").insert(rows).select("id");
      if (error) throw error;
      if (activeFolder && data && data.length > 0) { const memberRows = data.map((c: any) => ({ folder_id: activeFolder, contact_id: c.id })); await supabase.from("contact_folder_members").insert(memberRows); queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] }); }
      return data?.length || rows.length;
    },
    onSuccess: (count) => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setCsvImportOpen(false); setCsvText(""); setCsvCampaignId("none"); toast.success(`Imported ${count} contacts!`); },
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
      const rows = json.map((row) => ({ user_id: user!.id, name: String(row["Name"] || row["name"] || row["NAME"] || "").trim(), email: String(row["Email"] || row["email"] || row["EMAIL"] || row["E-mail"] || "").trim(), company_name: row["Company"] || row["company"] || null, campaign_id: excelCampaignId === "none" ? null : excelCampaignId, source: "excel" })).filter((r) => r.email && r.name);
      if (rows.length === 0) { toast.error("No valid rows found."); return; }
      const { data: inserted, error } = await supabase.from("contacts").insert(rows).select("id");
      if (error) throw error;
      if (activeFolder && inserted && inserted.length > 0) { const memberRows = inserted.map((c: any) => ({ folder_id: activeFolder, contact_id: c.id })); await supabase.from("contact_folder_members").insert(memberRows); queryClient.invalidateQueries({ queryKey: ["contact-folder-members"] }); }
      queryClient.invalidateQueries({ queryKey: ["contacts"] }); toast.success(`Imported ${inserted?.length || rows.length} contacts from Excel!`); setExcelCampaignId("none");
    } catch (err: any) { toast.error(err.message || "Failed to parse Excel file"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const syncGoogleSheets = async () => {
    try { const { data, error } = await supabase.functions.invoke("sync-google-sheets"); if (error) throw error; queryClient.invalidateQueries({ queryKey: ["contacts"] }); toast.success(data?.message || "Sync complete!"); }
    catch (err: any) { toast.error(err.message || "Sync failed."); }
  };

  const filtered = useMemo(() => {
    return contacts.filter((c: any) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter = activeFilter === "All" || c.status === activeFilter;
      const matchFolder = folderContactIds === null || folderContactIds.has(c.id);
      return matchSearch && matchFilter && matchFolder;
    });
  }, [contacts, search, activeFilter, folderContactIds]);

  const toggleSelect = (id: string) => { setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map((c: any) => c.id))); };
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of folderMembers as any[]) counts[m.folder_id] = (counts[m.folder_id] || 0) + 1;
    return counts;
  }, [folderMembers]);

  const dialogClass = "bg-card/95 backdrop-blur-2xl border-white/[0.08]";
  const inputClass = "h-11 bg-white/[0.04] border-white/[0.08] rounded-xl";
  const selectContentClass = "bg-popover/95 backdrop-blur-xl border-white/[0.08]";

  return (
    <div className="space-y-5">
      {/* Dialogs */}
      <Dialog open={linkOpen} onOpenChange={(open) => { setLinkOpen(open); if (!open) { setSelectedContact(null); setSelectedCampaignId("none"); } }}>
        <DialogContent className={dialogClass}>
          <DialogHeader><DialogTitle className="font-display font-bold">Assign Campaign</DialogTitle><DialogDescription>Link this contact to a campaign.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {selectedContact && <p className="text-sm text-muted-foreground">{selectedContact.name} · {selectedContact.email}</p>}
            <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}><SelectTrigger className={inputClass}><SelectValue placeholder="Select campaign" /></SelectTrigger><SelectContent className={selectContentClass}><SelectItem value="none">No campaign</SelectItem>{campaigns.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
            </div>
            <Button onClick={() => selectedContact && linkContactCampaign.mutate({ contactId: selectedContact.id, campaignId: selectedCampaignId })} disabled={!selectedContact || linkContactCampaign.isPending} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80">{linkContactCampaign.isPending ? "Saving..." : "Save Campaign"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className={dialogClass}><DialogHeader><DialogTitle className="font-display font-bold">Create Folder</DialogTitle><DialogDescription>Create a new folder to organize your contacts.</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folder Name</Label><Input placeholder="e.g. Hot Leads" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className={inputClass} /></div>
            <Button onClick={() => createFolder.mutate(newFolderName)} disabled={createFolder.isPending || !newFolderName.trim()} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80">{createFolder.isPending ? "Creating..." : "Create Folder"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent className={dialogClass}><DialogHeader><DialogTitle className="font-display font-bold">Rename Folder</DialogTitle><DialogDescription>Enter a new name.</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folder Name</Label><Input value={renameFolderValue} onChange={(e) => setRenameFolderValue(e.target.value)} className={inputClass} /></div>
            <Button onClick={() => renameFolderId && renameFolder.mutate({ id: renameFolderId, name: renameFolderValue })} disabled={renameFolder.isPending || !renameFolderValue.trim()} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80">{renameFolder.isPending ? "Saving..." : "Save"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={addToFolderOpen} onOpenChange={setAddToFolderOpen}>
        <DialogContent className={dialogClass}><DialogHeader><DialogTitle className="font-display font-bold">Add to Folder</DialogTitle><DialogDescription>Add {selectedIds.size} contacts to a folder.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Select value={addToFolderId} onValueChange={setAddToFolderId}><SelectTrigger className={inputClass}><SelectValue placeholder="Select folder" /></SelectTrigger><SelectContent className={selectContentClass}><SelectItem value="none">Select a folder...</SelectItem>{folders.map((f: any) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent></Select>
            <Button onClick={() => addToFolderId !== "none" && addContactsToFolder.mutate({ folderId: addToFolderId, contactIds: Array.from(selectedIds) })} disabled={addToFolderId === "none" || addContactsToFolder.isPending} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80">{addContactsToFolder.isPending ? "Adding..." : "Add to Folder"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">{contacts.length} total contacts</p>
        </motion.div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncGoogleSheets} className="rounded-xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"><RefreshCw className="w-4 h-4 mr-2" />Sync</Button>
          <div className="flex items-center gap-2">
            <Select value={excelCampaignId} onValueChange={setExcelCampaignId}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl bg-white/[0.04] border-white/[0.08]"><SelectValue placeholder="Campaign" /></SelectTrigger>
              <SelectContent className={selectContentClass}><SelectItem value="none">No campaign</SelectItem>{campaigns.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
            </Select>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
          </div>
          <Dialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"><Upload className="w-4 h-4 mr-2" />CSV</Button></DialogTrigger>
            <DialogContent className={dialogClass}><DialogHeader><DialogTitle className="font-display font-bold">Import CSV</DialogTitle><DialogDescription>Paste CSV: Name, Email, Company (optional).</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign (optional)</Label>
                  <Select value={csvCampaignId} onValueChange={setCsvCampaignId}><SelectTrigger className={inputClass}><SelectValue placeholder="Select campaign" /></SelectTrigger><SelectContent className={selectContentClass}><SelectItem value="none">No campaign</SelectItem>{campaigns.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
                </div>
                <textarea className="w-full h-40 p-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-mono resize-none text-foreground placeholder:text-muted-foreground/50" placeholder={"Name,Email,Company\nJohn Doe,john@example.com,Acme Inc"} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
                <Button onClick={() => importCsv.mutate()} disabled={importCsv.isPending} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80">{importCsv.isPending ? "Importing..." : "Import"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground glow-primary"><Plus className="w-4 h-4 mr-2" />Add Contact</Button></DialogTrigger>
            <DialogContent className={dialogClass}>
              <DialogHeader><DialogTitle className="font-display font-bold">Add Contact</DialogTitle><DialogDescription>Add contact details and optionally link to a campaign.{activeFolder && <span className="block text-xs mt-1 text-primary">Will be added to the current folder automatically.</span>}</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</Label><Input placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} /></div>
                <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label><Input type="email" placeholder="john@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} /></div>
                <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company (optional)</Label><Input placeholder="Acme Inc" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className={inputClass} /></div>
                <div className="space-y-2"><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign (optional)</Label>
                  <Select value={newCampaignId} onValueChange={setNewCampaignId}><SelectTrigger className={inputClass}><SelectValue placeholder="Select campaign" /></SelectTrigger><SelectContent className={selectContentClass}><SelectItem value="none">No campaign</SelectItem>{campaigns.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
                </div>
                <Button onClick={() => addContact.mutate()} disabled={addContact.isPending || !newName || !newEmail} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80">{addContact.isPending ? "Adding..." : "Add Contact"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => { setActiveFolder(null); setSelectedIds(new Set()); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 whitespace-nowrap ${
            activeFolder === null ? "bg-primary/15 text-primary border border-primary/25 glow-primary" : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
          }`}
        >
          <Folder className="w-4 h-4" />
          All Contacts
          <span className="ml-1 text-[11px] opacity-60">({contacts.length})</span>
        </button>
        {folders.map((folder: any) => (
          <div key={folder.id} className="flex items-center">
            <button
              onClick={() => { setActiveFolder(folder.id); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-l-xl text-[13px] font-semibold transition-all duration-200 whitespace-nowrap ${
                activeFolder === folder.id ? "bg-primary/15 text-primary border border-primary/25 border-r-0 glow-primary" : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] border-r-0 hover:bg-white/[0.08]"
              }`}
            >
              {activeFolder === folder.id ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              {folder.name}
              <span className="ml-1 text-[11px] opacity-60">({folderCounts[folder.id] || 0})</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`px-2 py-2 rounded-r-xl transition-all duration-200 ${
                  activeFolder === folder.id ? "bg-primary/15 text-primary border border-primary/25 border-l-0" : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] border-l-0 hover:bg-white/[0.08]"
                }`}><MoreHorizontal className="w-3.5 h-3.5" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={selectContentClass}>
                <DropdownMenuItem onClick={() => { setRenameFolderId(folder.id); setRenameFolderValue(folder.name); setRenameFolderOpen(true); }}><Pencil className="w-4 h-4 mr-2" />Rename</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={() => { if (confirm(`Delete "${folder.name}"?`)) deleteFolder.mutate(folder.id); }} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-xl" onClick={() => setCreateFolderOpen(true)}>
          <FolderPlus className="w-4 h-4 mr-1" />New Folder
        </Button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm input-glow rounded-xl transition-all">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] rounded-xl" />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 ${
                activeFilter === f ? "bg-primary/15 text-primary border border-primary/25" : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-2xl bg-primary/10 border border-primary/20 flex-wrap backdrop-blur-sm">
          <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="rounded-xl border-white/[0.08] bg-white/[0.04]"><XCircle className="w-4 h-4 mr-1" />Clear</Button>
          {folders.length > 0 && <Button variant="outline" size="sm" onClick={() => setAddToFolderOpen(true)} className="rounded-xl border-white/[0.08] bg-white/[0.04]"><FolderPlus className="w-4 h-4 mr-1" />Add to Folder</Button>}
          {activeFolder && (
            <Button variant="outline" size="sm" onClick={() => { if (confirm(`Remove ${selectedIds.size} from folder?`)) removeFromFolder.mutate({ folderId: activeFolder, contactIds: Array.from(selectedIds) }); }} disabled={removeFromFolder.isPending} className="rounded-xl border-white/[0.08] bg-white/[0.04]">
              <X className="w-4 h-4 mr-1" />{removeFromFolder.isPending ? "Removing..." : "Remove from Folder"}
            </Button>
          )}
          <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl border-white/[0.08] bg-white/[0.04]"><Link className="w-4 h-4 mr-1" />Assign Campaign</Button></DialogTrigger>
            <DialogContent className={dialogClass}><DialogHeader><DialogTitle className="font-display font-bold">Bulk Assign</DialogTitle><DialogDescription>Assign {selectedIds.size} contacts.</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <Select value={bulkCampaignId} onValueChange={setBulkCampaignId}><SelectTrigger className={inputClass}><SelectValue placeholder="Select campaign" /></SelectTrigger><SelectContent className={selectContentClass}><SelectItem value="none">No campaign</SelectItem>{campaigns.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
                <Button onClick={() => bulkAssign.mutate({ ids: Array.from(selectedIds), campaignId: bulkCampaignId })} disabled={bulkAssign.isPending} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80">{bulkAssign.isPending ? "Assigning..." : "Assign All"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" size="sm" onClick={() => { if (confirm(`Delete ${selectedIds.size} contacts?`)) bulkDelete.mutate(Array.from(selectedIds)); }} disabled={bulkDelete.isPending} className="rounded-xl">
            <Trash2 className="w-4 h-4 mr-1" />{bulkDelete.isPending ? "Deleting..." : "Delete All"}
          </Button>
        </motion.div>
      )}

      {/* Contacts Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="py-3 px-3 w-10">
                <button onClick={toggleSelectAll} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Name</th>
              <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Campaign</th>
              <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Company</th>
              <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Source</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">{activeFolder ? "No contacts in this folder" : "No contacts found"}</td></tr>
            ) : filtered.map((c: any) => (
              <tr key={c.id} className={`border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors ${selectedIds.has(c.id) ? "bg-primary/[0.05]" : ""}`}>
                <td className="py-3 px-3">
                  <button onClick={() => toggleSelect(c.id)} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                    {selectedIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </td>
                <td className="py-3 px-4 font-semibold text-foreground">{c.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{c.email}</td>
                <td className="py-3 px-4"><StatusBadge status={c.status as ContactStatus} /></td>
                <td className="py-3 px-4 text-muted-foreground">{c.campaigns?.name || <span className="text-muted-foreground/50">Unassigned</span>}</td>
                <td className="py-3 px-4 text-muted-foreground">{c.company_name || "—"}</td>
                <td className="py-3 px-4 text-muted-foreground capitalize">{c.source}</td>
                <td className="py-3 px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={selectContentClass}>
                      <DropdownMenuItem onClick={() => { setSelectedContact(c); setSelectedCampaignId(c.campaign_id || "none"); setLinkOpen(true); }}><Link className="w-4 h-4 mr-2" />Assign campaign</DropdownMenuItem>
                      {folders.length > 0 && <DropdownMenuItem onClick={() => { setSelectedIds(new Set([c.id])); setAddToFolderOpen(true); }}><FolderPlus className="w-4 h-4 mr-2" />Add to folder</DropdownMenuItem>}
                      {activeFolder && <DropdownMenuItem onClick={() => removeFromFolder.mutate({ folderId: activeFolder, contactIds: [c.id] })}><X className="w-4 h-4 mr-2" />Remove from folder</DropdownMenuItem>}
                      <DropdownMenuSeparator className="bg-white/[0.06]" />
                      <DropdownMenuItem onClick={() => deleteContact.mutate(c.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
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
