import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useReplyChecker } from "@/hooks/useReplyChecker";

const AppLayout = () => {
  // Automatically check for email replies every 5 minutes
  useReplyChecker();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="p-4 pt-20 lg:ml-64 lg:p-8 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
