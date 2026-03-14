import { useState, useRef, useMemo } from "react";
import { Search, RefreshCw, Upload, Plus, MoreHorizontal, Trash2, Link, FileSpreadsheet, CheckSquare, Square, XCircle } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").insert({
        user_id: user!.id,
        name: newName,
        email: newEmail,
        company_name: newCompany || null,
        campaign_id: newCampaignId === "none" ? null : newCampaignId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
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
      const { error } = await supabase.from("contacts").insert(rows);
      if (error) throw error;
      return rows.length;
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
      const { error } = await supabase.from("contacts").insert(rows);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Imported ${rows.length} contacts from Excel!`);
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

  const filtered = contacts.filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "All" || c.status === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <Dialog
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (!open) {
            setSelectedContact(null);
            setSelectedCampaignId("none");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Assign Campaign</DialogTitle>
            <DialogDescription>
              Link this contact to a campaign so it can enter that sequence.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedContact && (
              <p className="text-sm text-muted-foreground">
                {selectedContact.name} · {selectedContact.email}
              </p>
            )}
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() =>
                selectedContact && linkContactCampaign.mutate({ contactId: selectedContact.id, campaignId: selectedCampaignId })
              }
              disabled={!selectedContact || linkContactCampaign.isPending}
            >
              {linkContactCampaign.isPending ? "Saving..." : "Save Campaign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">{contacts.length} total contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncGoogleSheets}><RefreshCw className="w-4 h-4 mr-2" />Sync Sheets</Button>
          <div className="flex items-center gap-2">
            <Select value={excelCampaignId} onValueChange={setExcelCampaignId}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Campaign (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No campaign</SelectItem>
                {campaigns.map((campaign: any) => (
                  <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleExcelUpload}
            />
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map((campaign: any) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
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
                <DialogDescription>Add contact details and optionally link to a campaign now.</DialogDescription>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map((campaign: any) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
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
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No contacts found</td></tr>
            ) : filtered.map((c: any) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
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
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedContact(c);
                          setSelectedCampaignId(c.campaign_id || "none");
                          setLinkOpen(true);
                        }}
                      >
                        <Link className="w-4 h-4 mr-2" />Assign campaign
                      </DropdownMenuItem>
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
