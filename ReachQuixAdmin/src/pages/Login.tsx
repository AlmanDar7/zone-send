import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { ReachQuixIcon } from "@/components/AppLogo";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back, Administrator!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4 font-sans selection:bg-primary/20 selection:text-primary">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/80 bg-background p-6 sm:p-8 shadow-lg shadow-black/5">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <ReachQuixIcon size="xl" className="shadow-md" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Reach<span className="text-primary">Quix</span> Admin
            </h1>
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Shield className="h-3 w-3" />
              Super Admin Gateway
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Sign in with authorized administrative credentials to manage the platform.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@reachquix.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl font-semibold gap-2 shadow-sm" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Authenticating..." : "Sign In to Admin"}
          </Button>
        </form>
      </div>
    </div>
  );
};
