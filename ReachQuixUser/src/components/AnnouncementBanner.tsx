import { useState, useEffect } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

interface PublicConfig {
  maintenanceMode?: string;
  announcementBanner?: string;
  announcementType?: "info" | "warning" | "critical" | "success";
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : (typeof window !== "undefined" && window.location.hostname.endsWith("reachquix.com")
        ? "https://backend.reachquix.com/api"
        : "/api"));

export const AnnouncementBanner = () => {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/system/public-config`)
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => {});
  }, []);

  if (!config) return null;

  const isMaintenance = config.maintenanceMode === "true";
  const bannerText = config.announcementBanner;

  if (!isMaintenance && (!bannerText || dismissed)) {
    return null;
  }

  const type = config.announcementType || "info";

  const getStyle = () => {
    if (isMaintenance) {
      return "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300";
    }
    switch (type) {
      case "critical":
        return "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300";
      case "warning":
        return "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300";
      case "success":
        return "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
      default:
        return "bg-primary/10 border-primary/20 text-primary";
    }
  };

  const getIcon = () => {
    if (isMaintenance || type === "critical") return <AlertTriangle className="h-4 w-4 shrink-0" />;
    if (type === "warning") return <AlertTriangle className="h-4 w-4 shrink-0" />;
    if (type === "success") return <CheckCircle className="h-4 w-4 shrink-0" />;
    return <Bell className="h-4 w-4 shrink-0" />;
  };

  const displayText = isMaintenance
    ? "⚠️ System Notice: ReachQuix is currently operating under maintenance mode."
    : bannerText;

  return (
    <div className={`border-b px-4 py-2.5 text-xs font-medium flex items-center justify-between transition-all ${getStyle()}`}>
      <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
        {getIcon()}
        <span>{displayText}</span>
      </div>
      {!isMaintenance && (
        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 p-1 rounded transition-opacity"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
