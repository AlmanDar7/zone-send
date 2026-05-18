import { Outlet } from "react-router-dom";
import AppTopNav from "./AppTopNav";
import { useReplyChecker } from "@/hooks/useReplyChecker";

const AppLayout = () => {
  useReplyChecker();

  return (
    <div className="min-h-screen bg-background">
      <AppTopNav />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
