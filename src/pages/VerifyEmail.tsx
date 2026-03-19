import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, refreshUser } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const verificationEmail = useMemo(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email;
    return user?.email || stateEmail || sessionStorage.getItem("pendingVerificationEmail") || "";
  }, [location.state, user?.email]);

  useEffect(() => {
    if (verificationEmail) {
      sessionStorage.setItem("pendingVerificationEmail", verificationEmail);
    }

    if (user?.email_confirmed_at) {
      sessionStorage.removeItem("pendingVerificationEmail");
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user?.email_confirmed_at, verificationEmail]);

  const handleResend = async () => {
    if (!verificationEmail) {
      toast.error("Verification email could not be sent. Try again.");
      return;
    }

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) throw error;

      toast.success("Verification email sent successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification email could not be sent. Try again.");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);

    try {
      await supabase.auth.refreshSession();
      const refreshedUser = await refreshUser();

      if (refreshedUser?.email_confirmed_at) {
        sessionStorage.removeItem("pendingVerificationEmail");
        toast.success("Email verified successfully");
        navigate("/dashboard", { replace: true });
        return;
      }

      toast.error("Email not verified yet. Please check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email not verified yet. Please check your inbox.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem("pendingVerificationEmail");
    await signOut().catch(() => undefined);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 text-center"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-display font-bold text-foreground">Verify your email</h1>
          <p className="text-sm text-muted-foreground">
            We've sent a verification link to your email. Please verify to continue.
          </p>
          {verificationEmail && (
            <p className="text-sm font-medium text-foreground">{verificationEmail}</p>
          )}
        </div>

        <div className="space-y-3">
          <Button onClick={handleResend} variant="outline" className="w-full" disabled={resending}>
            {resending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
            Resend verification email
          </Button>

          <Button onClick={handleCheckVerification} className="w-full" disabled={checking}>
            {checking ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            I have verified
          </Button>

          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            Sign in with a different account
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
