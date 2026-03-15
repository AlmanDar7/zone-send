import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useReplyChecker } from "@/hooks/useReplyChecker";

const AppLayout = () => {
  // Automatically check for email replies every 5 minutes
  useReplyChecker();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
