import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  Settings,
  Mail,
  LogOut,
  Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/campaigns", icon: Send, label: "Campaigns" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-sidebar/80 backdrop-blur-2xl flex flex-col z-50 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg glow-primary">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-foreground font-display font-bold text-lg leading-tight tracking-tight">TechlyZone</h1>
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Email Automation</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold px-3 pb-2 pt-1">Navigation</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white/[0.08] text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                isActive 
                  ? "bg-primary/15 text-primary" 
                  : "text-muted-foreground group-hover:text-foreground"
              }`}>
                <item.icon className="w-[18px] h-[18px]" />
              </div>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-sm glow-primary" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 w-full group"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground group-hover:text-foreground transition-colors">
            <LogOut className="w-[18px] h-[18px]" />
          </div>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
