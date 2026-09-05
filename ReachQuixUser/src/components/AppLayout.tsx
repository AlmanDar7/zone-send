import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppLogo from "./AppLogo";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { useReplyChecker } from "@/hooks/useReplyChecker";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { SuspenseFallback } from "./SuspenseFallback";

/** Full-height shell only where pages need it; wizard steps stay content-height */
const COMPACT_MAIN_PATHS = ["/campaigns/new"];

const AppLayout = () => {
  useReplyChecker();
  const { pathname } = useLocation();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const compactMain = COMPACT_MAIN_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className={cn("bg-background flex min-h-screen flex-col")}>
      {/* Super Admin Live Announcement Banner */}
      <AnnouncementBanner />

      <div className="flex flex-1 flex-col lg:flex-row min-w-0">
        {/* Mobile Top Navigation */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 shadow-sm lg:hidden">
          <AppLogo size="sm" subtitle="Email Automation" />
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm hover:bg-muted"
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
          "flex-1 transition-all duration-300 min-w-0 w-full", 
          isSidebarExpanded ? "lg:ml-64" : "lg:ml-20",
          compactMain ? "pb-6" : ""
        )}>
          <Suspense fallback={<SuspenseFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
