import { GitBranch } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";

const Workflows = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Workflows</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build visual automation flows with triggers, delays, and conditions.
        </p>
      </div>
      <EmptyState
        icon={GitBranch}
        badge="Coming in Phase 3"
        title="Visual workflow builder is on the way"
        description="In the meantime, you can build linear email sequences from the Campaigns page."
        actionLabel="Open Campaigns"
        onAction={() => navigate("/campaigns")}
      />
    </div>
  );
};

export default Workflows;
