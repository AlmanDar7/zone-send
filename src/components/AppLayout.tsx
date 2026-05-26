import { Outlet, useLocation } from "react-router-dom";
import AppTopNav from "./AppTopNav";
import { useReplyChecker } from "@/hooks/useReplyChecker";
import { cn } from "@/lib/utils";

/** Full-height shell only where pages need it; wizard steps stay content-height */
const COMPACT_MAIN_PATHS = ["/campaigns/new"];

const AppLayout = () => {
  useReplyChecker();
  const { pathname } = useLocation();
  const compactMain = COMPACT_MAIN_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className={cn("bg-background", !compactMain && "min-h-screen")}>
      <AppTopNav />
      <main className={compactMain ? "pb-6" : undefined}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
