import { useState } from "react";
import { Search, Filter, RefreshCw, Upload, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import { motion } from "framer-motion";

type ContactStatus = "Active" | "Replied" | "Bounced" | "Unsubscribed" | "Completed";

interface Contact {
  id: number;
  name: string;
  email: string;
  status: ContactStatus;
  campaign: string;
  dateAdded: string;
}

const mockContacts: Contact[] = [
  { id: 1, name: "Sarah Chen", email: "sarah@techcorp.com", status: "Active", campaign: "SaaS Outreach", dateAdded: "2026-03-10" },
  { id: 2, name: "Mike Johnson", email: "mike@startup.io", status: "Replied", campaign: "SaaS Outreach", dateAdded: "2026-03-09" },
  { id: 3, name: "Lisa Wang", email: "lisa@design.co", status: "Active", campaign: "Agency Leads", dateAdded: "2026-03-08" },
  { id: 4, name: "James Brown", email: "old@invalid.com", status: "Bounced", campaign: "E-commerce", dateAdded: "2026-03-07" },
  { id: 5, name: "Emily Davis", email: "emily@corp.com", status: "Unsubscribed", campaign: "SaaS Outreach", dateAdded: "2026-03-06" },
  { id: 6, name: "David Kim", email: "david@agency.com", status: "Replied", campaign: "Agency Leads", dateAdded: "2026-03-05" },
  { id: 7, name: "Rachel Green", email: "rachel@shop.com", status: "Completed", campaign: "E-commerce", dateAdded: "2026-03-04" },
  { id: 8, name: "Tom Wilson", email: "tom@saas.io", status: "Active", campaign: "SaaS Outreach", dateAdded: "2026-03-03" },
];

const statusFilters: ("All" | ContactStatus)[] = ["All", "Active", "Replied", "Bounced", "Unsubscribed", "Completed"];

const Contacts = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const filtered = mockContacts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "All" || c.status === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">{mockContacts.length} total contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2" />Sync Sheets</Button>
          <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Import CSV</Button>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f}
            </button>
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
              <th className="text-left py-3 px-5 text-muted-foreground font-medium">Date Added</th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-5 font-medium text-foreground">{c.name}</td>
                <td className="py-3 px-5 text-muted-foreground">{c.email}</td>
                <td className="py-3 px-5"><StatusBadge status={c.status} /></td>
                <td className="py-3 px-5 text-muted-foreground">{c.campaign}</td>
                <td className="py-3 px-5 text-muted-foreground">{c.dateAdded}</td>
                <td className="py-3 px-5">
                  <button className="p-1 rounded hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
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
