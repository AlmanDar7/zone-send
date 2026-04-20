import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Check email verification - OAuth providers (e.g. Google) mark verification via user_metadata.email_verified
  const providers: string[] = (user.app_metadata as { providers?: string[] })?.providers ?? [];
  const isOAuthUser = providers.some((p) => p !== "email");
  const oauthVerified = (user.user_metadata as { email_verified?: boolean })?.email_verified === true;
  const emailVerified = !!user.email_confirmed_at || (isOAuthUser && oauthVerified);

  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
