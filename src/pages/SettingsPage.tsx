import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import WebhooksManager from "@/components/WebhooksManager";

const SettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [smtp, setSmtp] = useState({ host: "premium26.web-hosting.com", port: "465", username: "", password: "", from_name: "", from_email: "", use_ssl: true });
  const [showPassword, setShowPassword] = useState(false);
  const [sheet, setSheet] = useState({ sheet_url: "", service_account_json: "" });
  const [limit, setLimit] = useState("500");

  const { data: smtpData } = useQuery({
    queryKey: ["smtp-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("smtp_settings").select("*").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: sheetData } = useQuery({
    queryKey: ["sheet-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("google_sheet_settings").select("*").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: limitData } = useQuery({
    queryKey: ["sending-limits", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sending_limits").select("*").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (smtpData) setSmtp({
      host: smtpData.host, port: String(smtpData.port), username: smtpData.username,
      password: smtpData.password, from_name: smtpData.from_name || "", from_email: smtpData.from_email || "", use_ssl: smtpData.use_ssl,
    });
  }, [smtpData]);

  useEffect(() => {
    if (sheetData) setSheet({ sheet_url: sheetData.sheet_url || "", service_account_json: sheetData.service_account_json || "" });
  }, [sheetData]);

  useEffect(() => {
    if (limitData) setLimit(String(limitData.max_per_day));
  }, [limitData]);

  const saveSmtp = useMutation({
    mutationFn: async () => {
      const payload = { user_id: user!.id, host: smtp.host, port: parseInt(smtp.port), username: smtp.username, password: smtp.password, from_name: smtp.from_name, from_email: smtp.from_email, use_ssl: smtp.use_ssl };
      if (smtpData) {
        const { error } = await supabase.from("smtp_settings").update(payload).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("smtp_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["smtp-settings"] }); toast.success("SMTP settings saved!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const saveSheet = useMutation({
    mutationFn: async () => {
      const sheetId = sheet.sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || null;
      const payload = { user_id: user!.id, sheet_url: sheet.sheet_url, sheet_id: sheetId, service_account_json: sheet.service_account_json };
      if (sheetData) {
        const { error } = await supabase.from("google_sheet_settings").update(payload).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("google_sheet_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sheet-settings"] }); toast.success("Google Sheet settings saved!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const saveLimit = useMutation({
    mutationFn: async () => {
      const payload = { user_id: user!.id, max_per_day: parseInt(limit) || 500 };
      if (limitData) {
        const { error } = await supabase.from("sending_limits").update(payload).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sending_limits").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sending-limits"] }); toast.success("Sending limits saved!"); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your email automation</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card !p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">SMTP Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>SMTP Host</Label><Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} /></div>
          <div className="space-y-2"><Label>Port</Label><Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} /></div>
          <div className="space-y-2"><Label>Username / Email</Label><Input value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} placeholder="your@email.com" /></div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2"><Label>From Name</Label><Input value={smtp.from_name} onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })} placeholder="Reachquix" /></div>
          <div className="space-y-2"><Label>From Email</Label><Input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="hello@reachquix.com" /></div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={smtp.use_ssl} onCheckedChange={(v) => setSmtp({ ...smtp, use_ssl: v })} />
          <Label>Use SSL (port 465)</Label>
        </div>
        <Button size="sm" onClick={() => saveSmtp.mutate()} disabled={saveSmtp.isPending}>{saveSmtp.isPending ? "Saving..." : "Save SMTP Settings"}</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card !p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">Google Sheets Integration</h3>
        <div className="space-y-2">
          <Label>Google Sheet URL</Label>
          <Input value={sheet.sheet_url} onChange={(e) => setSheet({ ...sheet, sheet_url: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." />
        </div>
        <div className="space-y-2">
          <Label>Service Account JSON Key</Label>
          <Textarea value={sheet.service_account_json} onChange={(e) => setSheet({ ...sheet, service_account_json: e.target.value })} rows={4} placeholder='Paste your Google service account JSON here...' className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Create a service account in Google Cloud Console, enable Sheets API, and share your sheet with the service account email.</p>
        </div>
        <Button size="sm" onClick={() => saveSheet.mutate()} disabled={saveSheet.isPending}>{saveSheet.isPending ? "Saving..." : "Save Sheet Settings"}</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card !p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">Sending Limits</h3>
        <div className="space-y-2">
          <Label>Max Emails Per Day</Label>
          <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Overflow emails will be automatically queued for the next day.</p>
        <Button size="sm" onClick={() => saveLimit.mutate()} disabled={saveLimit.isPending}>{saveLimit.isPending ? "Saving..." : "Save Limits"}</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card !p-6">
        <WebhooksManager />
      </motion.div>
    </div>
  );
};

export default SettingsPage;
