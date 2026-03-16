import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useReplyChecker } from "@/hooks/useReplyChecker";

const AppLayout = () => {
  useReplyChecker();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[260px] p-8 min-h-screen">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
