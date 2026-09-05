import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Contact,
  Megaphone,
  Send,
  FileText,
  Activity,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Radio,
  Sliders,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo } from "./AppLogo";
import { Button } from "@/components/ui/button";
import { prefetchCoreAdminPages, prefetchAdminPage } from "@/lib/prefetch";

const NAV_ITEMS = [
  { name: "Command Center", href: "/", icon: LayoutDashboard },
  { name: "Users & Quotas", href: "/users", icon: Users },
  { name: "Global Contacts", href: "/contacts", icon: Contact },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Email Queue", href: "/queue", icon: Send },
  { name: "Tracking Telemetry", href: "/events", icon: Radio },
  { name: "Template Catalog", href: "/templates", icon: FileText },
  { name: "Mass Broadcast", href: "/broadcast", icon: Send },
  { name: "Audit Logs", href: "/audit-logs", icon: Terminal },
  { name: "Platform Settings", href: "/settings", icon: Sliders },
  { name: "System Health", href: "/system", icon: Activity },
];

export const AdminLayout = () => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    prefetchCoreAdminPages();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-muted/10 font-sans lg:flex-row">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 shadow-sm lg:hidden">
        <AppLogo size="sm" subtitle="Super Admin" />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 rounded-xl"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Drawer for Mobile / Fixed Sidebar for Desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-sm",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <AppLogo size="sm" subtitle="Super Admin" />
          <button
            onClick={closeMobile}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeMobile}
                onMouseEnter={() => prefetchAdminPage(item.href)}
                onFocus={() => prefetchAdminPage(item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 bg-muted/20">
          <div className="mb-3 px-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{user?.email || "admin@reachquix.com"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Full Access Administrator</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 min-h-screen w-full min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};
