import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  linkTo?: string | null;
  showName?: boolean;
  size?: "sm" | "md";
}

const AppLogo = ({ className, linkTo = "/dashboard", showName = true, size = "md" }: AppLogoProps) => {
  const iconSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const textSize = size === "sm" ? "text-base" : "text-lg";

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground",
          iconSize,
          size === "sm" ? "text-sm" : "text-base",
        )}
        aria-hidden
      >
        RQ
      </span>
      {showName && (
        <span className={cn("font-semibold tracking-tight text-foreground", textSize)}>
          ReachQuix
        </span>
      )}
    </div>
  );

  if (linkTo != null && linkTo !== "") {
    return (
      <NavLink to={linkTo} className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
        {content}
      </NavLink>
    );
  }

  return content;
};

export default AppLogo;
