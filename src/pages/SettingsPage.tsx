import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

const SettingsPage = () => {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your email automation</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stat-card !p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">SMTP Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SMTP Host</Label>
            <Input defaultValue="premium26.web-hosting.com" />
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input defaultValue="465" />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input placeholder="your@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
        </div>
        <Button size="sm">Save SMTP Settings</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card !p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">Google Sheets</h3>
        <div className="space-y-2">
          <Label>Google Sheet URL</Label>
          <Input placeholder="https://docs.google.com/spreadsheets/d/..." />
        </div>
        <Button size="sm">Connect Sheet</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card !p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">Sending Limits</h3>
        <div className="space-y-2">
          <Label>Max Emails Per Day</Label>
          <Input type="number" defaultValue="500" />
        </div>
        <p className="text-xs text-muted-foreground">Overflow emails will be automatically queued for the next day.</p>
        <Button size="sm">Save Limits</Button>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
