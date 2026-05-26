import { motion } from "framer-motion";
import { BarChart3, Home, PartyPopper, Send } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  recipients: number;
  scheduledAt: Date | null;
  onViewAnalytics: () => void;
  onBackToDashboard: () => void;
};

const SuccessModal = ({
  open,
  onClose,
  campaignName,
  recipients,
  scheduledAt,
  onViewAnalytics,
  onBackToDashboard,
}: Props) => {
  const sentNow = !scheduledAt;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md overflow-hidden border-0 p-0">
        <div className="relative bg-gradient-to-br from-primary/10 via-background to-background p-8 text-center">
          {sentNow && <CelebrationBurst />}

          <motion.div
            initial={{ scale: 0, rotate: sentNow ? -20 : -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: sentNow ? 260 : 220, damping: sentNow ? 14 : 18 }}
            className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            {sentNow ? (
              <PartyPopper className="h-10 w-10" strokeWidth={2.2} />
            ) : (
              <Send className="h-10 w-10" strokeWidth={2.2} />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 mt-6 space-y-2"
          >
            <h2 className="font-display text-2xl font-bold text-foreground">
              {sentNow ? "Woohoo! Your email has been sent!" : "You're all set!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {sentNow
                ? `Your message is on its way to ${recipients.toLocaleString()} recipient${recipients === 1 ? "" : "s"}.`
                : scheduledAt
                  ? `Your email will be sent on ${format(scheduledAt, "PPP 'at' p")} to ${recipients.toLocaleString()} recipient${recipients === 1 ? "" : "s"}.`
                  : `Your email will be sent at the date and time you selected.`}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 mt-6 space-y-2 rounded-xl border border-border bg-card p-4 text-left"
          >
            <Row label="Campaign" value={campaignName} />
            <Row label="Recipients" value={recipients.toLocaleString()} />
            <Row
              label={sentNow ? "Sent" : "Scheduled for"}
              value={sentNow ? "Just now" : scheduledAt ? format(scheduledAt, "PPP 'at' p") : "—"}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="relative z-10 mt-6 flex flex-col gap-2 sm:flex-row"
          >
            <Button onClick={onViewAnalytics} className="flex-1 rounded-full">
              <BarChart3 className="mr-2 h-4 w-4" /> View Analytics
            </Button>
            <Button variant="outline" onClick={onBackToDashboard} className="flex-1 rounded-full">
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CelebrationBurst = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    {Array.from({ length: 18 }).map((_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      const distance = 70 + (i % 3) * 28;
      return (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[28%] h-2 w-2 rounded-full"
          style={{
            backgroundColor: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))",
          }}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.4],
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance - 20,
          }}
          transition={{ duration: 0.9, delay: 0.05 + i * 0.03, ease: "easeOut" }}
        />
      );
    })}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export default SuccessModal;
