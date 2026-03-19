import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;
      toast.success("Verification email sent! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend email");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (data.user?.email_confirmed_at) {
        toast.success("Email verified! Redirecting...");
        // Force session refresh
        await supabase.auth.refreshSession();
        navigate("/dashboard", { replace: true });
      } else {
        toast.error("Email not yet verified. Please check your inbox.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check status");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
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

        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Verify your email
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{user?.email}</span>.
            Please check your inbox and click the link to continue.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCheckVerification}
            className="w-full"
            disabled={checking}
          >
            {checking ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            I have verified my email
          </Button>

          <Button
            onClick={handleResend}
            variant="outline"
            className="w-full"
            disabled={resending}
          >
            {resending ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Resend verification email
          </Button>

          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in with a different account
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
