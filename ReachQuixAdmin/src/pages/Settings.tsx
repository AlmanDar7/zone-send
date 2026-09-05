import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sliders,
  Shield,
  Zap,
  Megaphone,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

export const Settings = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({
    maintenanceMode: "false",
    defaultDailyLimit: "500",
    allowNewSignups: "true",
    aiCopywritingEnabled: "true",
    announcementBanner: "",
    announcementType: "info",
    trackingDomain: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.admin.settings.get(),
  });

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: Record<string, string>) => api.admin.settings.update(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Global system settings saved successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save settings"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const isMaintenance = formData.maintenanceMode === "true";
  const isSignupsAllowed = formData.allowNewSignups === "true";
  const isAiEnabled = formData.aiCopywritingEnabled === "true";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Sliders className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Global Platform Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure system-wide feature flags, default user sending quotas, and live announcement banners.
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending || isLoading}
          className="gap-2 rounded-xl shadow-sm h-10 font-semibold"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feature Flags & Controls */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Maintenance Mode */}
            <Card className={isMaintenance ? "border-red-500/40 bg-red-500/[0.02]" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className={isMaintenance ? "text-red-500" : "text-muted-foreground"} />
                    Maintenance Mode
                  </CardTitle>
                  <Badge variant={isMaintenance ? "destructive" : "secondary"}>
                    {isMaintenance ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription>
                  When enabled, non-admin users will be notified that the system is under scheduled maintenance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isMaintenance ? "default" : "outline"}
                    className={isMaintenance ? "bg-red-600 hover:bg-red-700 text-white flex-1" : "flex-1"}
                    onClick={() => setFormData({ ...formData, maintenanceMode: "true" })}
                  >
                    Enable Maintenance
                  </Button>
                  <Button
                    type="button"
                    variant={!isMaintenance ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, maintenanceMode: "false" })}
                  >
                    Normal Operation
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* New Signups Toggle */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="text-primary" />
                    Public Registrations
                  </CardTitle>
                  <Badge variant={isSignupsAllowed ? "default" : "secondary"}>
                    {isSignupsAllowed ? "Open" : "Invite Only"}
                  </Badge>
                </div>
                <CardDescription>
                  Control whether new users can create accounts freely or registration is locked.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isSignupsAllowed ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, allowNewSignups: "true" })}
                  >
                    Allow Signups
                  </Button>
                  <Button
                    type="button"
                    variant={!isSignupsAllowed ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, allowNewSignups: "false" })}
                  >
                    Disable Signups
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Copywriting */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Zap className="text-primary" />
                    AI Copywriting Engine
                  </CardTitle>
                  <Badge variant={isAiEnabled ? "default" : "secondary"}>
                    {isAiEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription>
                  Enable or disable AI email copywriting tools across the user builder interface.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isAiEnabled ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, aiCopywritingEnabled: "true" })}
                  >
                    AI Enabled
                  </Button>
                  <Button
                    type="button"
                    variant={!isAiEnabled ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, aiCopywritingEnabled: "false" })}
                  >
                    Disable AI
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Default Daily Sending Quota */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="text-primary" />
                  Default Daily Sending Quota
                </CardTitle>
                <CardDescription>
                  Maximum daily emails allowed for new accounts upon registration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="100000"
                    value={formData.defaultDailyLimit}
                    onChange={(e) => setFormData({ ...formData, defaultDailyLimit: e.target.value })}
                    className="rounded-xl h-11 text-base font-semibold"
                  />
                  <span className="text-xs font-semibold uppercase text-muted-foreground shrink-0">
                    Emails / Day
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Announcement Banner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Megaphone className="text-primary" />
                Live Broadcast Announcement Banner
              </CardTitle>
              <CardDescription>
                Display an instant notification banner across all user dashboards in real-time. Leave empty to hide.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Announcement Message</Label>
                <Input
                  value={formData.announcementBanner}
                  onChange={(e) => setFormData({ ...formData, announcementBanner: e.target.value })}
                  placeholder="e.g. Scheduled maintenance this Sunday at 2 AM UTC..."
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Banner Severity Type</Label>
                <select
                  value={formData.announcementType}
                  onChange={(e) => setFormData({ ...formData, announcementType: e.target.value })}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="info">🔵 Informational (Blue)</option>
                  <option value="warning">🟡 Warning / Notice (Yellow)</option>
                  <option value="critical">🔴 Critical Alert (Red)</option>
                  <option value="success">🟢 Success / Announcement (Green)</option>
                </select>
              </div>

              {formData.announcementBanner && (
                <div className="rounded-xl border p-4 bg-muted/40 mt-4 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Live Preview</p>
                  <div className="rounded-lg bg-primary/10 p-3 text-sm text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary shrink-0" />
                    <span>{formData.announcementBanner}</span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-border pt-4 flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} className="gap-2 rounded-xl font-semibold">
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Platform Settings
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
};
