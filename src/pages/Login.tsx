import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/[0.07] blur-[120px] animate-glow-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/[0.05] blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
      
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg glow-primary">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl text-foreground tracking-tight">TechlyZone</h1>
              <p className="text-[11px] text-muted-foreground font-medium tracking-widest uppercase">Email Automation</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
              {isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {isSignUp ? "Start automating your outreach" : "Sign in to manage your campaigns"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                <div className="input-glow rounded-xl transition-all">
                  <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-12 bg-card/60 border-white/[0.08] rounded-xl text-foreground placeholder:text-muted-foreground/50" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
              <div className="input-glow rounded-xl transition-all">
                <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 bg-card/60 border-white/[0.08] rounded-xl text-foreground placeholder:text-muted-foreground/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
              <div className="input-glow rounded-xl transition-all">
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 bg-card/60 border-white/[0.08] rounded-xl text-foreground placeholder:text-muted-foreground/50" />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold text-sm shadow-lg glow-primary transition-all duration-300" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-semibold hover:text-primary/80 transition-colors">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center border-l border-white/[0.06] relative">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-md text-center space-y-6 p-8 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Outreach
          </div>
          <h3 className="text-3xl font-display font-extrabold text-foreground tracking-tight leading-tight">Automate your<br />email outreach</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Send personalized cold emails, automate follow-ups, detect replies, and manage contacts — all from one dashboard.
          </p>
          <div className="flex justify-center gap-10 pt-6">
            {[
              { val: "7.2%", label: "Reply Rate" },
              { val: "4,832", label: "Contacts" },
              { val: "182", label: "Replies" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-display font-extrabold text-primary tracking-tight">{stat.val}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
