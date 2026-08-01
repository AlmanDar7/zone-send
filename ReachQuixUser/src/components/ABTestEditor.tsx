import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FlaskConical } from "lucide-react";

interface ABTestEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  subjectA: string;
  subjectB: string;
  bodyA: string;
  bodyB: string;
  onSubjectAChange: (val: string) => void;
  onSubjectBChange: (val: string) => void;
  onBodyAChange: (val: string) => void;
  onBodyBChange: (val: string) => void;
  winningVariant?: string | null;
}

const ABTestEditor = ({
  enabled,
  onEnabledChange,
  subjectA,
  subjectB,
  bodyA,
  bodyB,
  onSubjectAChange,
  onSubjectBChange,
  onBodyAChange,
  onBodyBChange,
  winningVariant,
}: ABTestEditorProps) => {
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <Label className="font-medium">A/B Testing</Label>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-3">
          {winningVariant && (
            <div className="text-xs px-3 py-2 bg-success/10 text-success rounded-lg">
              Winner: Variant {winningVariant.toUpperCase()} — automatically selected based on open rates
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("A")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "A"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Variant A
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("B")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "B"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Variant B
            </button>
          </div>

          {activeTab === "A" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Subject A</Label>
                <Input value={subjectA} onChange={e => onSubjectAChange(e.target.value)} placeholder="Subject line for variant A" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Body A</Label>
                <Textarea value={bodyA} onChange={e => onBodyAChange(e.target.value)} placeholder="Email body for variant A" rows={4} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Subject B</Label>
                <Input value={subjectB} onChange={e => onSubjectBChange(e.target.value)} placeholder="Subject line for variant B" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Body B</Label>
                <Textarea value={bodyB} onChange={e => onBodyBChange(e.target.value)} placeholder="Email body for variant B" rows={4} />
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Emails will be split 50/50 between variants. After 50 sends, the winning variant (by open rate) will be automatically selected.
          </p>
        </div>
      )}
    </div>
  );
};

export default ABTestEditor;
