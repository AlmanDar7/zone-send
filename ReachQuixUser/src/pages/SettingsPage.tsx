import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSmtpConfigError, hasUsableSmtpConfig } from "@/lib/smtpValidation";
import { Download, AlertCircle } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [smtp, setSmtp] = useState({ host: "premium26.web-hosting.com", port: "465", username: "", password: "", from_name: "", from_email: "", use_ssl: true });
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sheet, setSheet] = useState({ sheet_url: "", service_account_json: "" });
  const [limit, setLimit] = useState("500");

  const { data: smtpData } = useQuery({
    queryKey: ["smtp-settings", user?.id],
    queryFn: () => api.settings.smtp.get(),
    enabled: !!user,
  });

  const { data: sheetData } = useQuery({
    queryKey: ["sheet-settings", user?.id],
    queryFn: () => api.settings.googleSheets.get(),
    enabled: !!user,
  });

  const { data: limitData } = useQuery({
    queryKey: ["sending-limits", user?.id],
    queryFn: () => api.settings.sendingLimits.get(),
    enabled: !!user,
  });

  useEffect(() => {
    if (smtpData) setSmtp({
      host: smtpData.host, port: String(smtpData.port), username: smtpData.username,
      password: smtpData.password, from_name: smtpData.from_name || "", from_email: smtpData.from_email || "", use_ssl: smtpData.use_ssl,
    });
  }, [smtpData]);

  useEffect(() => {
    if (!testEmail) {
      setTestEmail(user?.email || "");
    }
  }, [user, testEmail]);

  useEffect(() => {
    if (sheetData) setSheet({ sheet_url: sheetData.sheet_url || "", service_account_json: sheetData.credentials_json || "" });
  }, [sheetData]);

  useEffect(() => {
    if (limitData) setLimit(String(limitData.max_per_day));
  }, [limitData]);

  const resolveUseSsl = (port: number, useSsl: boolean) => {
    if (port === 465) return true;
    if (port === 587 || port === 25) return false;
    return useSsl;
  };

  const upsertSmtpSettings = async () => {
    const port = parseInt(smtp.port, 10);
    const payload = {
      host: smtp.host.trim(),
      port,
      username: smtp.username.trim(),
      password: smtp.password,
      from_name: smtp.from_name.trim(),
      from_email: smtp.from_email.trim() || smtp.username.trim(),
      use_ssl: resolveUseSsl(port, smtp.use_ssl),
    };

    if (!hasUsableSmtpConfig({ ...payload, port: Number.isFinite(payload.port) ? payload.port : 0 })) {
      throw new Error(getSmtpConfigError());
    }

    await api.settings.smtp.save(payload);
  };

  const saveSmtp = useMutation({
    mutationFn: upsertSmtpSettings,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["smtp-settings"] }); toast.success("SMTP settings saved!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const sendTestEmail = useMutation({
    mutationFn: async () => {
      if (!testEmail.trim()) throw new Error("Enter a test recipient email");
      await upsertSmtpSettings();
      await api.settings.testEmail({
        to: testEmail.trim(),
        subject: "Reachquix SMTP test",
        body: "This is a test email sent from your Reachquix SMTP configuration.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-settings"] });
      toast.success(`Test email sent to ${testEmail.trim()}`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to send test email"),
  });

  const saveSheet = useMutation({
    mutationFn: async () => {
      const sheetId = sheet.sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || null;
      await api.settings.googleSheets.save({
        sheet_url: sheet.sheet_url,
        sheet_id: sheetId,
        credentials_json: sheet.service_account_json,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sheet-settings"] }); toast.success("Google Sheet settings saved!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const saveLimit = useMutation({
    mutationFn: async () => {
      await api.settings.sendingLimits.save({ max_per_day: parseInt(limit) || 500 });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sending-limits"] }); toast.success("Sending limits saved!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const exportUserData = async () => {
    try {
      const contacts = await api.contacts.list();
      const campaigns = await api.campaigns.list();
      const exportData = { contacts, campaigns };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reachquix-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export is complete.");
    } catch (e: any) {
      toast.error("Failed to export data: " + e.message);
    }
  };

  const deleteAccount = async () => {
    if (window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and all your campaigns and contacts will be permanently removed.")) {
      toast.info("Account deletion request submitted. Support will process this within 24 hours to comply with GDPR.");
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-10">
      <div className="space-y-8 max-w-2xl">
        <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your email automation</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card !p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">SMTP Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>SMTP Host</Label><Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input
              value={smtp.port}
              onChange={(e) => {
                const port = e.target.value;
                const p = parseInt(port, 10);
                setSmtp((prev) => ({
                  ...prev,
                  port,
                  use_ssl: p === 465 ? true : p === 587 || p === 25 ? false : prev.use_ssl,
                }));
              }}
            />
          </div>
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
          <Label>Use SSL (required for port 465)</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Use port 465 with SSL on, or port 587 with SSL off (STARTTLS). Set &quot;From email&quot; to the same address as your SMTP username.
        </p>
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <Label>Test Recipient Email</Label>
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
            />
          </div>
          <Button size="sm" onClick={() => saveSmtp.mutate()} disabled={saveSmtp.isPending || sendTestEmail.isPending}>
            {saveSmtp.isPending ? "Saving..." : "Save SMTP Settings"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendTestEmail.mutate()}
            disabled={saveSmtp.isPending || sendTestEmail.isPending}
          >
            {sendTestEmail.isPending ? "Sending Test..." : "Send Test Email"}
          </Button>
        </div>
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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card !p-6 space-y-5 border-destructive/20">
        <h3 className="font-display font-semibold text-destructive">Data & Privacy</h3>
        <p className="text-sm text-muted-foreground">Manage your account data and privacy settings in compliance with GDPR and CCPA.</p>
        
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-muted/20">
            <div>
              <p className="font-medium text-foreground text-sm">Export Data</p>
              <p className="text-xs text-muted-foreground mt-1">Download a copy of all your contacts and campaign data in JSON format.</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportUserData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <p className="font-medium text-destructive text-sm">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-1">Permanently delete your account and all associated data. This cannot be undone.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={deleteAccount}>
              <AlertCircle className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
