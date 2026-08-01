import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// For now, let any authenticated user log in.

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If you want to enforce exact admin email:
  // if (!ADMIN_EMAILS.includes(user.email || "")) {
  //   return (
  //     <div className="flex min-h-screen flex-col items-center justify-center p-4">
  //       <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
  //       <p className="text-muted-foreground">You do not have administrator privileges.</p>
  //     </div>
  //   );
  // }

  return <Outlet />;
};
