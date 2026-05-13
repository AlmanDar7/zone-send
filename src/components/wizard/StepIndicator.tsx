import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = { current: number; steps: string[]; onJump?: (i: number) => void };

const StepIndicator = ({ current, steps, onJump }: Props) => (
  <div className="w-full">
    <div className="flex items-center justify-between gap-2">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onJump && idx <= current && onJump(idx)}
              className={cn(
                "flex items-center gap-2 transition-all",
                onJump && idx <= current ? "cursor-pointer" : "cursor-default",
              )}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.05 : 1,
                  backgroundColor: done || active ? "hsl(var(--primary))" : "hsl(var(--muted))",
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shadow-sm",
                  done || active ? "text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : idx}
              </motion.div>
              <span
                className={cn(
                  "hidden text-sm font-medium md:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={false}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                  className="h-full bg-primary"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default StepIndicator;
