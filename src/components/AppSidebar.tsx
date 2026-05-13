import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Mail, FileText, GitBranch, Users, BarChart3,
  Settings, LogOut, UserCircle2, Menu, X, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/emails", icon: Mail, label: "Emails" },
  { to: "/forms", icon: FileText, label: "Forms" },
  { to: "/workflows", icon: GitBranch, label: "Workflows" },
  { to: "/audience", icon: Users, label: "Audience" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const bottomItems = [
  { to: "/profile", icon: UserCircle2, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderItem = (item: typeof mainItems[number]) => {
    const isActive =
      location.pathname === item.to ||
      (item.to === "/emails" && location.pathname.startsWith("/templates")) ||
      (item.to === "/audience" && location.pathname.startsWith("/contacts"));
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
        )}
      >
        <item.icon className={cn("h-[18px] w-[18px] transition-transform", isActive && "scale-110")} />
        <span className="flex-1">{item.label}</span>
        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold leading-tight text-sidebar-primary-foreground">
            Reachquix
          </h1>
          <p className="text-[11px] tracking-wide text-sidebar-foreground/70">EMAIL AUTOMATION</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {mainItems.map(renderItem)}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border/60 p-3">
        {bottomItems.map(renderItem)}
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-sidebar-foreground hover:bg-sidebar-accent/40 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;
