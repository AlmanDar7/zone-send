import { motion } from "framer-motion";
import { Check, BarChart3, Home } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  recipients: number;
  scheduledAt: Date | null; // null => sent now
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
}: Props) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-md overflow-hidden border-0 p-0">
      <div className="bg-gradient-to-br from-primary/10 via-background to-background p-8 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        >
          <Check className="h-10 w-10" strokeWidth={3} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 space-y-2"
        >
          <h2 className="font-display text-2xl font-bold text-foreground">
            {scheduledAt ? "Email Scheduled!" : "Email Sent Successfully"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Your campaign is on its way to {recipients.toLocaleString()} recipient{recipients === 1 ? "" : "s"}.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 space-y-2 rounded-xl border border-border bg-card p-4 text-left"
        >
          <Row label="Campaign" value={campaignName} />
          <Row label="Recipients" value={recipients.toLocaleString()} />
          <Row
            label={scheduledAt ? "Scheduled for" : "Sent at"}
            value={(scheduledAt || new Date()).toLocaleString()}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
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

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export default SuccessModal;
