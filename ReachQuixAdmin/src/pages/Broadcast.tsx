import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Send, Megaphone, Users, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Broadcast = () => {
  const [recipientType, setRecipientType] = useState<"users" | "contacts">("users");
  const [subject, setSubject] = useState("");
  const [senderName, setSenderName] = useState("ReachQuix System Admin");
  const [bodyHtml, setBodyHtml] = useState("");

  const broadcastMutation = useMutation({
    mutationFn: (payload: { recipientType: "users" | "contacts"; subject: string; bodyHtml: string; senderName?: string }) =>
      api.admin.broadcast.send(payload),
    onSuccess: (data: any) => {
      toast.success(data.message || "Broadcast dispatched successfully!");
      setSubject("");
      setBodyHtml("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to dispatch broadcast"),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !bodyHtml) {
      toast.error("Subject and message body are required");
      return;
    }

    if (confirm(`Are you sure you want to send this broadcast to ALL ${recipientType}?`)) {
      broadcastMutation.mutate({
        recipientType,
        subject,
        bodyHtml,
        senderName,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2.5 sm:gap-3">
            <Megaphone className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Global Platform Broadcast
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Dispatch urgent updates, system notifications, or marketing announcements to all users or global contacts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSend}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Compose Broadcast Email</CardTitle>
            <CardDescription>
              This message will be dispatched directly through your configured administrative SMTP server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Audience */}
            <div className="space-y-3">
              <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Target Audience</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setRecipientType("users")}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-start gap-3.5 ${
                    recipientType === "users" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <Users className={`h-5 w-5 mt-0.5 ${recipientType === "users" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-semibold text-sm text-foreground">All Registered Users</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Send to every registered account owner on ReachQuix</p>
                  </div>
                </div>

                <div
                  onClick={() => setRecipientType("contacts")}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-start gap-3.5 ${
                    recipientType === "contacts" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <Mail className={`h-5 w-5 mt-0.5 ${recipientType === "contacts" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-semibold text-sm text-foreground">All Global Contacts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Send to all active audience contacts across all user lists</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sender Name */}
            <div className="space-y-2">
              <Label>Sender Name</Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="ReachQuix System Admin"
                className="h-11 rounded-xl"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Email Subject Line</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important Announcement: Platform Updates & Features"
                className="h-11 rounded-xl"
                required
              />
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <Label>Message Content (HTML / Text)</Label>
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="<p>Dear ReachQuix User,</p><p>We are excited to announce our new update...</p>"
                className="min-h-[220px] rounded-xl font-mono text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                You can write plain text or HTML tags (<code className="text-primary">&lt;p&gt;</code>, <code className="text-primary">&lt;strong&gt;</code>, <code className="text-primary">&lt;a&gt;</code>).
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Broadcasts cannot be undone once dispatched.</span>
            </div>
            <Button
              type="submit"
              disabled={broadcastMutation.isPending}
              className="gap-2 rounded-xl font-semibold h-11 px-6 shadow-sm"
            >
              {broadcastMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {broadcastMutation.isPending ? "Dispatching Broadcast..." : "Send Broadcast Now"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};
