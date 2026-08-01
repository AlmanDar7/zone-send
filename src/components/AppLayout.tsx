import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import AppSidebar from "./AppSidebar";
import AppLogo from "./AppLogo";
import { useReplyChecker } from "@/hooks/useReplyChecker";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

/** Full-height shell only where pages need it; wizard steps stay content-height */
const COMPACT_MAIN_PATHS = ["/campaigns/new"];

const AppLayout = () => {
  useReplyChecker();
  const { pathname } = useLocation();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const compactMain = COMPACT_MAIN_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className={cn("bg-background flex min-h-screen flex-col lg:flex-row")}>
      
      {/* Mobile Top Navigation */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <AppLogo size="sm" />
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <AppSidebar 
        isExpanded={isSidebarExpanded} 
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)} 
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main className={cn(
        "flex-1 transition-all duration-300", 
        isSidebarExpanded ? "lg:ml-64" : "lg:ml-20",
        compactMain ? "pb-6" : ""
      )}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
