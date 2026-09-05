import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  linkTo?: string | null;
  showName?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  subtitle?: string;
}

export const ReachQuixIcon = ({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-11 w-11",
    xl: "h-14 w-14",
  };

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl shadow-sm transition-transform hover:scale-105", sizeMap[size], className)}>
      <img
        src="/logo.svg"
        alt="ReachQuix Logo"
        className="h-full w-full object-cover object-center"
        onError={(e) => {
          // Fallback to PNG if SVG fails
          const target = e.currentTarget;
          if (!target.src.endsWith(".png")) {
            target.src = "/android-chrome-192x192.png";
          }
        }}
      />
    </div>
  );
};

const AppLogo = ({
  className,
  linkTo = "/dashboard",
  showName = true,
  size = "md",
  subtitle,
}: AppLogoProps) => {
  const textSize = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  }[size];

  const content = (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <ReachQuixIcon size={size} />
      {showName && (
        <div className="flex flex-col">
          <span className={cn("font-display font-bold tracking-tight text-foreground leading-tight", textSize)}>
            Reach<span className="text-primary">Quix</span>
          </span>
          {subtitle && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (linkTo != null && linkTo !== "") {
    return (
      <NavLink
        to={linkTo}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl inline-flex items-center"
      >
        {content}
      </NavLink>
    );
  }

  return content;
};

export default AppLogo;
