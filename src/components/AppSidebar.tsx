import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  BarChart3,
  Settings,
  Mail,
  LogOut,
  Inbox,
  UserCircle2,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const primaryNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/profile", icon: UserCircle2, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const emailNavItems = [
  { to: "/campaigns", icon: Send, label: "Campaigns" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/email-queue", icon: Inbox, label: "Email Queue" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isEmailSectionActive = emailNavItems.some((item) => location.pathname === item.to);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-50">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sidebar-primary-foreground font-display font-bold text-lg leading-tight">Reachquix</h1>
            <p className="text-sidebar-foreground text-xs">Email Automation</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {primaryNavItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </NavLink>
          );
        })}

        <Collapsible defaultOpen={isEmailSectionActive} className="space-y-1">
          <CollapsibleTrigger
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              isEmailSectionActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
            )}
          >
            <Mail className="w-4 h-4" />
            Email
            <div className="ml-auto flex items-center gap-2">
              {isEmailSectionActive && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
              <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            <div className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
              {emailNavItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </NavLink>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {primaryNavItems.slice(2).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
