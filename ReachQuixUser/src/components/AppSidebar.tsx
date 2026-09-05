import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Mail, FileText, GitBranch, Users, BarChart3, Megaphone,
  Settings, LogOut, UserCircle2, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppLogo, { ReachQuixIcon } from "./AppLogo";
import { prefetchCorePages, prefetchPage } from "@/lib/prefetch";

const mainItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/emails", icon: Mail, label: "Emails" },
  { to: "/forms", icon: FileText, label: "Forms" },
  { to: "/workflows", icon: GitBranch, label: "Workflows" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const bottomItems = [
  { to: "/profile", icon: UserCircle2, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface AppSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const AppSidebar = ({ isExpanded, onToggle, mobileOpen, setMobileOpen }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    prefetchCorePages();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderItem = (item: typeof mainItems[number]) => {
    const isActive =
      location.pathname === item.to ||
      (item.to === "/campaigns" && location.pathname.startsWith("/campaigns")) ||
      (item.to === "/emails" && location.pathname.startsWith("/emails")) ||
      (item.to === "/forms" && location.pathname.startsWith("/forms")) ||
      (item.to === "/contacts" && (location.pathname.startsWith("/contacts") || location.pathname.startsWith("/audience")));
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setMobileOpen(false)}
        onMouseEnter={() => prefetchPage(item.to)}
        onFocus={() => prefetchPage(item.to)}
        title={!isExpanded ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
          !isExpanded && "justify-center px-0"
        )}
      >
        <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform", isActive && "scale-110")} />
        {isExpanded && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
        {isActive && isExpanded && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
        {isActive && !isExpanded && <div className="absolute right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      <div className={cn("flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/40", !isExpanded && "justify-center px-2")}>
        {isExpanded ? (
          <AppLogo size="sm" subtitle="Email Automation" />
        ) : (
          <ReachQuixIcon size="sm" />
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {mainItems.map(renderItem)}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border/60 p-3">
        {bottomItems.map(renderItem)}
        <button
          onClick={handleSignOut}
          title={!isExpanded ? "Sign Out" : undefined}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
            !isExpanded && "justify-center px-0"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {isExpanded && <span>Sign Out</span>}
        </button>
      </div>
      
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute -right-3 top-7 h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
        aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isExpanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar shadow-lg transition-all duration-300",
          isExpanded ? "w-64" : "w-20",
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
