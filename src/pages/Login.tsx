import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        toast.success("Account created! Check your email to confirm.");
      } else {
        await signIn(email, password);
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
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
              {isSignUp ? "Start automating your outreach" : "Sign in to manage your campaigns"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
            {!isSignUp && (
              <button type="button" onClick={handleForgotPassword} className="text-sm text-primary hover:underline w-full text-right">
                Forgot password?
              </button>
            )}
          </form>

          <p className="text-sm text-center text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
              {isSignUp ? "Sign in" : "Sign up"}
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
