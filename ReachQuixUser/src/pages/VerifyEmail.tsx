import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { sendVerificationEmail } from "@/lib/firebaseAuth";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ReachQuixIcon } from "@/components/AppLogo";

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

    if (user?.emailVerified) {
      sessionStorage.removeItem("pendingVerificationEmail");
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user?.emailVerified, verificationEmail]);

  const handleResend = async () => {
    setResending(true);

    try {
      await sendVerificationEmail();
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
      const refreshedUser = await refreshUser();

      if (refreshedUser?.emailVerified) {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 text-center rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm"
      >
        <div className="flex justify-center">
          <ReachQuixIcon size="xl" className="shadow-md" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">Verify your email</h1>
          <p className="text-xs text-muted-foreground">
            We&apos;ve sent a verification link to your email address. Please click the link to activate your account.
          </p>
          {verificationEmail && (
            <div className="rounded-xl bg-muted/50 py-2 px-3 text-xs font-semibold text-foreground break-all">
              {verificationEmail}
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <Button onClick={handleCheckVerification} className="w-full h-11 rounded-xl font-semibold gap-2" disabled={checking}>
            {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            I have verified
          </Button>

          <Button onClick={handleResend} variant="outline" className="w-full h-11 rounded-xl font-semibold gap-2" disabled={resending}>
            {resending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Resend verification email
          </Button>

          <button
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 block w-full text-center"
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
