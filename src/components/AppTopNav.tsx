import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, Menu, Settings, UserCircle2, X } from "lucide-react";
import AppLogo from "@/components/AppLogo";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { to: "/emails", label: "Emails" },
  { to: "/forms", label: "Forms" },
  { to: "/workflows", label: "Workflows" },
  { to: "/contacts", label: "Audience" },
  { to: "/analytics", label: "Analytics" },
];

const AppTopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-nav", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const userInitial =
    profile?.full_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  const isActive = (to: string) => {
    if (location.pathname === to) return true;
    if (to === "/workflows" && (location.pathname.startsWith("/workflows") || location.pathname.startsWith("/campaigns"))) {
      return true;
    }
    if (to === "/analytics" && location.pathname.startsWith("/analytics")) return true;
    if (to === "/contacts" && (location.pathname.startsWith("/contacts") || location.pathname.startsWith("/audience"))) {
      return true;
    }
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-10">
        <AppLogo className="justify-self-start" size="sm" />

        <nav className="hidden items-center justify-center gap-10 md:flex lg:gap-14">
          {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "px-2 py-2 text-sm transition-colors",
                  isActive(item.to)
                    ? "font-semibold text-foreground"
                    : "font-normal text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2 justify-self-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                {userInitial}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <UserCircle2 className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col items-center gap-2 border-t border-border bg-card px-4 py-5 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "w-full max-w-xs py-3.5 text-center text-sm",
                isActive(item.to) ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
};

export default AppTopNav;
