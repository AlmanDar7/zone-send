import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AIEmailWriterProps {
  onInsert?: (text: string) => void;
  onInsertSubject?: (text: string) => void;
}

const stripJsonFences = (raw: string) =>
  raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

const formatAiContent = (raw: string, contentType: "subject" | "body" | "full") => {
  const cleaned = stripJsonFences(raw);
  if (contentType === "body") return cleaned;

  try {
    const parsed = JSON.parse(cleaned);
    if (contentType === "full" && parsed && typeof parsed === "object") {
      const subject = parsed.subject ? String(parsed.subject) : "";
      const body = parsed.body ? String(parsed.body) : "";
      if (subject && body) return `Subject: ${subject}\n\n${body}`;
      if (subject) return `Subject: ${subject}`;
      if (body) return body;
    }
    if (contentType === "subject" && Array.isArray(parsed)) {
      return parsed.map((s, i) => `${i + 1}. ${String(s)}`).join("\n");
    }
  } catch {
    // fall through to raw text
  }

  return cleaned;
};

const AIEmailWriter = ({ onInsert, onInsertSubject }: AIEmailWriterProps) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("professional");
  const [type, setType] = useState<"subject" | "body" | "full">("full");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [rawResult, setRawResult] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult("");
    setRawResult("");
    try {
      const data = await api.ai.writeEmail({ prompt, type, tone });
      if (!data.success) throw new Error(data.error);
      setRawResult(data.content);
      setResult(formatAiContent(data.content, type));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    const source = rawResult || result;
    if (type === "full") {
      try {
        const cleaned = stripJsonFences(source);
        const parsed = JSON.parse(cleaned);
        if (parsed.subject && onInsertSubject) onInsertSubject(parsed.subject);
        if (parsed.body && onInsert) onInsert(parsed.body);
        toast.success("Inserted subject and body!");
      } catch {
        if (onInsert) onInsert(source);
        toast.success("Content inserted!");
      }
    } else if (type === "body" && onInsert) {
      onInsert(source);
      toast.success("Body inserted!");
    } else if (type === "subject" && onInsertSubject) {
      try {
        const cleaned = stripJsonFences(source);
        const subjects = JSON.parse(cleaned);
        if (Array.isArray(subjects) && subjects.length > 0) {
          onInsertSubject(subjects[0]);
          toast.success("Subject line inserted!");
        }
      } catch {
        onInsertSubject(source.split("\n")[0].replace(/^\d+\.\s*/, ""));
        toast.success("Subject inserted!");
      }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          AI Writer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Email Writer
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>What are you selling/promoting?</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A SaaS tool that automates social media scheduling for small businesses. Target audience: marketing managers at startups."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Generate</Label>
              <Select value={type} onValueChange={(v: "subject" | "body" | "full") => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Email</SelectItem>
                  <SelectItem value="subject">Subject Lines</SelectItem>
                  <SelectItem value="body">Email Body</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
          {result && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="text-sm text-foreground whitespace-pre-wrap">{result}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                {(onInsert || onInsertSubject) && (
                  <Button size="sm" onClick={handleInsert} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Insert into Template
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIEmailWriter;
