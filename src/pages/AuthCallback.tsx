import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const waitForSession = async (attempts = 20, delayMs = 150) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return session;
    }

    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  }

  return null;
};

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const finishAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorDescription = url.searchParams.get("error_description");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const session = await waitForSession();

        if (!session?.user) {
          throw new Error("Authentication could not be completed.");
        }

        if (mounted) {
          toast.success("Logged in successfully");
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        if (mounted) {
          toast.error(error instanceof Error ? error.message : "Google sign in failed. Please try again.");
          navigate("/login", { replace: true });
        }
      }
    };

    void finishAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <h1 className="text-xl font-display font-semibold text-foreground">Completing Google sign in</h1>
        <p className="text-sm text-muted-foreground">Please wait while we finish your authentication.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
