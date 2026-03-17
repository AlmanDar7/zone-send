import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

const StatCard = ({ title, value, change, changeType = "neutral", icon: Icon, iconColor }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-display font-bold mt-1 text-foreground">{value}</p>
          {change && (
            <p
              className={`text-xs mt-2 font-medium ${
                changeType === "positive"
                  ? "text-success"
                  : changeType === "negative"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor || "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${iconColor ? "text-card" : "text-primary"}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
