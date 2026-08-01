import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STEPS = ["Double Opt-in", "Notifications", "Success Action", "Publish"];

const FormPublishWizard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Settings state
  const [doubleOptIn, setDoubleOptIn] = useState("no");
  const [notifyMe, setNotifyMe] = useState("no");
  const [successAction, setSuccessAction] = useState("message");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: form } = useQuery({
    queryKey: ["form", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("name").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleNext = () => {
    if (step < STEPS.length) {
      setStep(step + 1);
    }
  };

  const copyEmbedCode = () => {
    const code = `<script src="https://app.reachquix.com/forms/embed/${id}.js" async></script>\n<div id="rq-form-${id}"></div>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Embed code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    const link = `https://app.reachquix.com/f/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Direct link copied to clipboard");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-muted/30 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {form?.name || "Publish Form"}
            </h1>
            <p className="text-xs text-muted-foreground">Step {step} of {STEPS.length}: {STEPS[step - 1]}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-12 sm:px-6">
        {/* Progress Bar */}
        <div className="mb-10 flex items-center justify-between px-2">
          {STEPS.map((label, index) => {
            const isCompleted = step > index + 1;
            const isActive = step === index + 1;
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "border-2 border-primary bg-background text-primary"
                        : "border-2 border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isActive || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <Card className="overflow-hidden p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="mb-6 font-display text-2xl font-bold">Should we enable double opt-in?</h2>
                <p className="mb-8 text-muted-foreground">
                  Double opt-in requires subscribers to confirm their email address before being added to your list. It keeps your list healthy and improves deliverability.
                </p>
                <RadioGroup value={doubleOptIn} onValueChange={setDoubleOptIn} className="space-y-4">
                  <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="yes" id="do-yes" />
                    <Label htmlFor="do-yes" className="flex-1 cursor-pointer font-medium">Yes, require double opt-in (Recommended)</Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="no" id="do-no" />
                    <Label htmlFor="do-no" className="flex-1 cursor-pointer font-medium">No, add them directly to my list</Label>
                  </div>
                </RadioGroup>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="mb-6 font-display text-2xl font-bold">Notify me when someone subscribes?</h2>
                <p className="mb-8 text-muted-foreground">
                  Get a quick email notification every time a new subscriber joins your list through this form.
                </p>
                <RadioGroup value={notifyMe} onValueChange={setNotifyMe} className="space-y-4">
                  <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="yes" id="notif-yes" />
                    <Label htmlFor="notif-yes" className="flex-1 cursor-pointer font-medium">Yes, notify me</Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="no" id="notif-no" />
                    <Label htmlFor="notif-no" className="flex-1 cursor-pointer font-medium">No, don't notify me</Label>
                  </div>
                </RadioGroup>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="mb-6 font-display text-2xl font-bold">What happens after they submit?</h2>
                <p className="mb-8 text-muted-foreground">
                  Choose what your subscribers see immediately after filling out this form.
                </p>
                <RadioGroup value={successAction} onValueChange={setSuccessAction} className="space-y-4">
                  <div className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="message" id="action-msg" />
                    <Label htmlFor="action-msg" className="flex-1 cursor-pointer font-medium">Display success message</Label>
                  </div>
                  <div className="flex flex-col space-y-4 rounded-lg border border-border p-4 transition-colors">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="redirect" id="action-url" />
                      <Label htmlFor="action-url" className="flex-1 cursor-pointer font-medium">Redirect to a URL</Label>
                    </div>
                    {successAction === "redirect" && (
                      <div className="pl-7">
                        <Input 
                          placeholder="https://yourwebsite.com/thank-you" 
                          value={redirectUrl} 
                          onChange={e => setRedirectUrl(e.target.value)} 
                        />
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="font-display text-3xl font-bold">Your form is ready!</h2>
                  <p className="text-muted-foreground">Copy the embed code below to add it to your website.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>HTML Embed Code</Label>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm text-muted-foreground overflow-x-auto">
                        {`<script src="https://app.reachquix.com/forms/embed/${id}.js" async></script>\n<div id="rq-form-${id}"></div>`}
                      </pre>
                      <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={copyEmbedCode}>
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-border"></div>
                    <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm">OR</span>
                    <div className="flex-grow border-t border-border"></div>
                  </div>

                  <div className="space-y-2 text-center">
                    <p className="text-sm font-medium">Share link directly</p>
                    <Button variant="outline" className="w-full" onClick={copyLink}>
                      <Copy className="w-4 h-4 mr-2" /> Copy shareable link
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Footer Actions */}
        {step < STEPS.length && (
          <div className="mt-8 flex justify-end">
            <Button size="lg" className="rounded-full px-8 text-base shadow-sm" onClick={handleNext}>
              Continue <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
        {step === STEPS.length && (
          <div className="mt-8 flex justify-center">
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base shadow-sm" onClick={() => navigate("/forms")}>
              Back to My Forms
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormPublishWizard;
