import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ReachQuixIcon } from "@/components/AppLogo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    const mode = params.get("mode");

    if (mode === "resetPassword" && code) {
      verifyPasswordResetCode(getFirebaseAuth(), code)
        .then(() => setOobCode(code))
        .catch(() => setOobCode(null))
        .finally(() => setCheckingLink(false));
      return;
    }

    setOobCode(null);
    setCheckingLink(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
      toast.success("Password updated successfully!");
      navigate("/login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (checkingLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!oobCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6 text-center rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex justify-center">
            <ReachQuixIcon size="xl" className="shadow-md" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display font-bold text-xl text-foreground">Link Expired</h1>
            <p className="text-xs text-muted-foreground">Invalid or expired reset link. Please request a new one from the login page.</p>
          </div>
          <Button onClick={() => navigate("/login")} variant="outline" className="w-full h-11 rounded-xl">
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6 rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <ReachQuixIcon size="lg" />
          <div>
            <h1 className="font-display font-bold text-xl text-foreground">Set New Password</h1>
            <p className="text-xs text-muted-foreground">Enter your new secure password below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10 h-11 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Confirm Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-xl"
            />
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
