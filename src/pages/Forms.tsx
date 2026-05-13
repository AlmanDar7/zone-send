import { FileText, Sparkles } from "lucide-react";
import EmptyState from "@/components/EmptyState";

const Forms = () => (
  <div className="space-y-8">
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Forms</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create popups, embedded forms, and landing pages to grow your audience.
      </p>
    </div>
    <EmptyState
      icon={FileText}
      badge="Coming in Phase 2"
      title="Forms builder is on the way"
      description="A drag-and-drop form builder with popups, embeds, and landing pages — all connected to your audience — is being prepared and will land in the next update."
    />
  </div>
);

export default Forms;
