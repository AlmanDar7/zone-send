import { useNavigate } from "react-router-dom";
import { Plus, LayoutTemplate, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { visualTemplatePresets } from "@/lib/template-presets";
import { FORM_CATEGORY } from "@/lib/content-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";
import TemplatePreview from "@/components/TemplatePreview";
import { buildLeadMagnetHtmlFromOrder } from "@/lib/visual-template-sections";

type Props = {
  category: "email" | "form";
};

const TemplateGallery = ({ category }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [pendingPresetId, setPendingPresetId] = useState<string | undefined>();
  const [pendingEditId, setPendingEditId] = useState<string | undefined>();
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");

  const { templates: starterTemplates, error: starterError } = useMemo(() => {
    try {
      const presets = visualTemplatePresets.filter((p) => p.category === category);
      const templates = presets.map((preset) => {
        const config = preset.createConfig();
        const html_body = buildLeadMagnetHtmlFromOrder(config);

        return {
          preset,
          starter: {
            html_body,
            body: preset.defaultType === "Visual" ? "This is a visual layout. Switch to the visual editor to customize it." : preset.description,
          },
        };
      });
      return { templates, error: null };
    } catch (err: any) {
      console.error("Error generating starter templates:", err);
      return { templates: [], error: err.message || String(err) };
    }
  }, [category]);

  const { data: folders = [] } = useQuery({
    queryKey: ["contact_folders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_folders")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && category === "form",
  });
  
  const isForms = category === "form";
  const title = isForms ? "Choose a Form Template" : "Choose an Email Template";
  const subtitle = isForms
    ? "Start with a beautiful layout designed to convert, or build your own from scratch."
    : "Pick a layout designed for engagement, or start from scratch.";
    
  const builderUrl = isForms ? "/forms/builder" : "/emails/builder";

  const handleCreateClick = (presetId?: string, editId?: string) => {
    if (isForms) {
      setPendingPresetId(presetId);
      setPendingEditId(editId);
      setSegmentModalOpen(true);
    } else {
      executeCreate(presetId, undefined, editId);
    }
  };

  const executeCreate = (presetId?: string, folderId?: string, editId?: string) => {
    const url = new URLSearchParams();
    if (editId) {
      url.set("edit", editId);
    } else {
      url.set("new", "1");
      if (presetId) url.set("preset", presetId);
      if (isForms) {
        url.set("category", FORM_CATEGORY);
        if (folderId) {
          url.set("segmentId", folderId);
        }
      }
    }
    
    navigate(`${builderUrl}?${url.toString()}`);
  };

  return (
    <div className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-10 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-4 pt-4 pb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground text-base max-w-xl">{subtitle}</p>
        
        {starterTemplates.length === 0 && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center w-full max-w-md mx-auto whitespace-pre-wrap">
            Failed to load starter templates. Error: {starterError}
          </div>
        )}

        <div className="pt-4">
          <Button size="lg" onClick={() => handleCreateClick()} className="shadow-md rounded-full px-8">
            <Plus className="mr-2 h-5 w-5" />
            Start from scratch
          </Button>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {starterTemplates.map(({ preset, starter }, index) => (
          <motion.div
            key={preset.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg transition-all cursor-pointer"
            onClick={() => handleCreateClick(preset.id)}
          >
            <TemplatePreview html={starter.html_body} body={starter.body} scaled className="h-[270px] pointer-events-none" />
            
            <div className="p-5 flex-1 flex flex-col border-t border-border">
              <h3 className="font-semibold text-lg text-foreground">{preset.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {preset.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={segmentModalOpen} onOpenChange={setSegmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a segment</DialogTitle>
            <DialogDescription>
              Subscribers who opt-in to this form will automatically be added to this segment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (General Audience)</SelectItem>
                {folders.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                setSegmentModalOpen(false);
                const folderIdToPass = selectedFolderId === "none" ? undefined : selectedFolderId;
                executeCreate(pendingPresetId, folderIdToPass, pendingEditId);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateGallery;
