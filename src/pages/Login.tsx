import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const getAuthErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Authentication failed";

  if (message.includes("Invalid login credentials")) return "Invalid email or password.";
  if (message.includes("User already registered")) return "Email already exists.";
  if (message.includes("verify your email")) return "Please verify your email before signing in.";

  return message;
};

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        sessionStorage.setItem("pendingVerificationEmail", email);
        toast.success("Verification email sent successfully");
        navigate("/verify-email", { state: { email } });
        return;
      }

      await signIn(email, password);
      toast.success("Logged in successfully");
      navigate("/dashboard");
    } catch (error) {
      const message = getAuthErrorMessage(error);
      if (isSignUp && !message) {
        toast.error("Verification email could not be sent. Try again.");
      } else {
        toast.error(message || "Verification email could not be sent. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) throw result.error;

      if (!result.redirected) {
        toast.success("Logged in successfully");
        navigate("/dashboard");
      }
    } catch {
      toast.error("Google sign in failed. Please try again.");
    } finally {
      setOauthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset sent. Check your email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">Reachquix</h1>
              <p className="text-xs text-muted-foreground">Email Automation Platform</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? "Create your account and verify your email to continue" : "Sign in to manage your campaigns"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-3 font-medium"
            onClick={handleGoogleSignIn}
            disabled={oauthLoading}
          >
            <GoogleIcon />
            {oauthLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          {!isSignUp && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              className="text-sm text-primary hover:underline w-full text-center disabled:opacity-60"
            >
              {forgotLoading ? "Sending reset email..." : "Forgot password?"}
            </button>
          )}

          <p className="text-sm text-center text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-medium hover:underline"
              type="button"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-primary/5 border-l border-border">
        <div className="max-w-md text-center space-y-4 p-8">
          <h3 className="text-2xl font-display font-bold text-foreground">Automate your outreach</h3>
          <p className="text-muted-foreground">
            Send personalized cold emails, automate follow-ups, detect replies, and manage contacts — all from one dashboard.
          </p>
          <div className="flex justify-center gap-8 pt-4">
            <div>
              <p className="text-2xl font-display font-bold text-primary">7.2%</p>
              <p className="text-xs text-muted-foreground">Avg Reply Rate</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-primary">4,832</p>
              <p className="text-xs text-muted-foreground">Contacts Reached</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-primary">182</p>
              <p className="text-xs text-muted-foreground">Replies This Month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
