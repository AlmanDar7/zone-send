import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Webhook, Trash2, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const EVENT_TYPES = [
  { value: "email.sent", label: "Email Sent" },
  { value: "email.opened", label: "Email Opened" },
  { value: "email.clicked", label: "Link Clicked" },
  { value: "email.replied", label: "Reply Received" },
  { value: "email.bounced", label: "Email Bounced" },
  { value: "contact.created", label: "Contact Created" },
  { value: "contact.updated", label: "Contact Updated" },
];

const WebhooksManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [viewDeliveries, setViewDeliveries] = useState<string | null>(null);

  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhooks", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("webhooks").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["webhook-deliveries", viewDeliveries],
    queryFn: async () => {
      if (!viewDeliveries) return [];
      const { data } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("webhook_id", viewDeliveries)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!viewDeliveries,
  });

  const createWebhook = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!name || !url || selectedEvents.length === 0) throw new Error("Fill all required fields");
      const { error } = await supabase.from("webhooks").insert({
        user_id: user.id,
        name,
        url,
        secret: secret || null,
        events: selectedEvents,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setOpen(false);
      setName("");
      setUrl("");
      setSecret("");
      setSelectedEvents([]);
      toast.success("Webhook created!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleWebhook = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("webhooks").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Webhooks</h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Webhook</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="My Zapier Integration" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input placeholder="https://hooks.zapier.com/..." value={url} onChange={e => setUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Secret (optional, for HMAC signing)</Label>
                <Input placeholder="your-secret-key" value={secret} onChange={e => setSecret(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Events to listen for</Label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map(evt => (
                    <label key={evt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedEvents.includes(evt.value)}
                        onCheckedChange={() => toggleEvent(evt.value)}
                      />
                      {evt.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={() => createWebhook.mutate()} disabled={createWebhook.isPending} className="w-full">
                {createWebhook.isPending ? "Creating..." : "Create Webhook"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {webhooks.length > 0 ? (
        <div className="space-y-3">
          {webhooks.map((wh: any) => (
            <motion.div key={wh.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card !p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{wh.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${wh.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {wh.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{wh.url}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {wh.events?.map((e: string) => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{e}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setViewDeliveries(viewDeliveries === wh.id ? null : wh.id)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Switch checked={wh.is_active} onCheckedChange={(checked) => toggleWebhook.mutate({ id: wh.id, is_active: checked })} />
                  <Button variant="ghost" size="icon" onClick={() => deleteWebhook.mutate(wh.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {viewDeliveries === wh.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent Deliveries</p>
                  {deliveries.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {deliveries.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{d.event_type}</span>
                          <span className={d.success ? "text-success" : "text-destructive"}>{d.status_code || "Failed"}</span>
                          <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No deliveries yet.</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No webhooks configured. Add one to send data to Zapier, Make, or any external service.</p>
      )}
    </div>
  );
};

export default WebhooksManager;
