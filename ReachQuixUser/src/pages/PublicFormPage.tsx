import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ["public-form", id],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/public/forms/${id}`);
      if (!res.ok) throw new Error("Form not found");
      return res.json();
    },
    enabled: !!id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/public/forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          company_name: company.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit form");
      }

      setSubmitted(true);
      toast.success("Thank you for signing up!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Form Unavailable</h2>
          <p className="text-sm text-muted-foreground mt-2">
            This form is no longer accepting submissions or could not be found.
          </p>
        </Card>
      </div>
    );
  }

  const formConfig = (form.design_config as any) || {};
  const primaryColor = formConfig.primaryColor || "#10b981";
  const buttonText = formConfig.buttonText || "Subscribe Now";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6">
      <Card className="max-w-lg w-full p-8 sm:p-10 shadow-xl border-border/60 backdrop-blur-sm bg-card/90 rounded-2xl">
        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">You're Subscribed!</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Thank you for subscribing. We've received your details and will keep you updated.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto mb-1">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
                {form.name || "Join Our Community"}
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {form.body || "Sign up below to receive our latest updates, insights, and exclusive announcements."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2 text-left">
                <Label htmlFor="name" className="text-xs font-semibold">Your Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="email" className="text-xs font-semibold">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="company" className="text-xs font-semibold">Company (Optional)</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  className="rounded-xl h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 text-base font-semibold rounded-xl mt-2 transition-transform active:scale-[0.99]"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </form>

            <p className="text-center text-[11px] text-muted-foreground pt-2">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
