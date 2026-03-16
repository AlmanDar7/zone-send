import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  gradient?: string;
}

const StatCard = ({ title, value, change, changeType = "neutral", icon: Icon, iconColor, gradient }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card group relative overflow-hidden"
    >
      {/* Subtle mesh gradient overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mesh-gradient rounded-[inherit]" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[13px] text-muted-foreground font-medium tracking-wide">{title}</p>
          <p className="text-3xl font-display font-extrabold tracking-tight text-foreground">{value}</p>
          {change && (
            <p className={`text-xs mt-1.5 font-semibold ${
              changeType === "positive" ? "text-success" 
              : changeType === "negative" ? "text-destructive" 
              : "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
          gradient || "bg-primary/10"
        }`}>
          <Icon className={`w-5 h-5 ${iconColor || "text-primary"}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
