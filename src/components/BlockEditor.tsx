import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Copy,
  Trash2,
  Plus,
  Heading1,
  Type as TypeIcon,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  Move,
  Columns,
  Save,
  Palette,
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import {
  type Block,
  type BlockId,
  type BlockType,
  type TemplateDocument,
  type BrandTheme,
  type HeadingBlock,
  type TextBlock,
  type ImageBlock,
  type ButtonBlock,
  type DividerBlock,
  type SpacerBlock,
  type ColumnsBlock,
  createBlock,
  cloneBlock,
  blockTypeLabels,
  findAndUpdateBlock,
  removeBlock,
  duplicateBlockById,
  applyThemeToDocument,
} from "@/lib/template-blocks";

const BLOCK_ICONS: Record<BlockType, JSX.Element> = {
  heading: <Heading1 className="h-4 w-4" />,
  text: <TypeIcon className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  button: <MousePointerClick className="h-4 w-4" />,
  divider: <Minus className="h-4 w-4" />,
  spacer: <Move className="h-4 w-4" />,
  columns: <Columns className="h-4 w-4" />,
};

const ALL_BLOCK_TYPES: BlockType[] = [
  "heading",
  "text",
  "image",
  "button",
  "divider",
  "spacer",
  "columns",
];

type Props = {
  doc: TemplateDocument;
  onChange: (doc: TemplateDocument) => void;
};

const BlockEditor = ({ doc, onChange }: Props) => {
  const [selectedId, setSelectedId] = useState<BlockId | null>(null);

  const updateBlocks = (blocks: Block[]) => onChange({ ...doc, blocks });

  const updateBlockById = (id: BlockId, updater: (b: Block) => Block) =>
    updateBlocks(findAndUpdateBlock(doc.blocks, id, updater));

  const addBlock = (type: BlockType) => {
    const block = createBlock(type);
    updateBlocks([...doc.blocks, block]);
    setSelectedId(block.id);
  };

  const deleteBlock = (id: BlockId) => {
    updateBlocks(removeBlock(doc.blocks, id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicate = (id: BlockId) => updateBlocks(duplicateBlockById(doc.blocks, id));

  const findSelected = (blocks: Block[]): Block | null => {
    for (const b of blocks) {
      if (b.id === selectedId) return b;
      if (b.type === "columns") {
        const found = findSelected(b.left) || findSelected(b.right);
        if (found) return found;
      }
    }
    return null;
  };

  const selected = useMemo(() => findSelected(doc.blocks), [doc.blocks, selectedId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = doc.blocks.findIndex((b) => b.id === active.id);
    const newIndex = doc.blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateBlocks(arrayMove(doc.blocks, oldIndex, newIndex));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
      {/* Add blocks panel */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add block</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              {BLOCK_ICONS[type]}
              <span>{blockTypeLabels[type]}</span>
            </button>
          ))}
        </div>

        <BrandThemesPanel doc={doc} onChange={onChange} />
        <SectionsPanel doc={doc} onChange={onChange} />
      </div>

      {/* Canvas */}
      <div
        className="min-h-[500px] rounded-xl border border-border p-4"
        style={{ background: doc.background }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={doc.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div
              className="mx-auto rounded-lg p-4"
              style={{
                background: doc.contentBackground,
                maxWidth: doc.width,
                fontFamily: doc.fontFamily,
              }}
            >
              {doc.blocks.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Add your first block from the left panel.
                </p>
              ) : (
                doc.blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    selected={selectedId === block.id}
                    onSelect={() => setSelectedId(block.id)}
                    onDuplicate={() => duplicate(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                    selectedId={selectedId}
                    onSelectChild={setSelectedId}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Inspector */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selected ? `Edit ${blockTypeLabels[selected.type]}` : "Document"}
        </p>
        {selected ? (
          <BlockInspector block={selected} onChange={(b) => updateBlockById(b.id, () => b)} />
        ) : (
          <DocumentInspector doc={doc} onChange={onChange} />
        )}
      </div>
    </div>
  );
};

/* ---------------- Sortable block ---------------- */

type SortableBlockProps = {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  selectedId: BlockId | null;
  onSelectChild: (id: BlockId) => void;
};

const SortableBlock = ({
  block,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  selectedId,
  onSelectChild,
}: SortableBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative my-1 rounded-md border pl-6 pr-6 ${
        selected ? "border-primary" : "border-transparent hover:border-border"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className={`absolute left-0 top-1/2 -translate-y-1/2 flex cursor-grab touch-none items-center rounded bg-background p-1 shadow transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div
        className={`absolute right-0 top-1 flex flex-col gap-1 transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded bg-background p-1 shadow"
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded bg-background p-1 shadow"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>
      <BlockRender block={block} selectedId={selectedId} onSelectChild={onSelectChild} />
    </div>
  );
};

/* ---------------- Block render (in-canvas) ---------------- */

const BlockRender = ({
  block,
  selectedId,
  onSelectChild,
}: {
  block: Block;
  selectedId: BlockId | null;
  onSelectChild: (id: BlockId) => void;
}) => {
  const replace = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, k) =>
      k === "FirstName" ? "Ava" : k === "Email" ? "ava@northstar.co" : k === "CompanyName" ? "Northstar" : `{{${k}}}`,
    );
  switch (block.type) {
    case "heading": {
      const Tag = (`h${block.level}`) as keyof JSX.IntrinsicElements;
      return (
        <div style={{ padding: `${block.paddingY}px 0`, textAlign: block.alignment }}>
          <Tag
            style={{
              margin: 0,
              fontSize: block.level === 1 ? 32 : block.level === 2 ? 24 : 18,
              color: block.color,
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            {replace(block.text)}
          </Tag>
        </div>
      );
    }
    case "text":
      return (
        <div
          style={{
            padding: `${block.paddingY}px 0`,
            textAlign: block.alignment,
            color: block.color,
            fontSize: block.fontSize,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {replace(block.text)}
        </div>
      );
    case "image":
      return (
        <div style={{ padding: `${block.paddingY}px 0`, textAlign: block.alignment }}>
          {block.src ? (
            <img
              src={block.src}
              alt={block.alt}
              style={{ width: `${block.width}%`, height: "auto", borderRadius: 8, display: "inline-block" }}
            />
          ) : (
            <div className="rounded border border-dashed border-border p-6 text-xs text-muted-foreground">
              No image set
            </div>
          )}
        </div>
      );
    case "button":
      return (
        <div style={{ padding: `${block.paddingY}px 0`, textAlign: block.alignment }}>
          <span
            style={{
              display: "inline-block",
              background: block.background,
              color: block.textColor,
              padding: "14px 28px",
              borderRadius: block.radius,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {replace(block.text)}
          </span>
        </div>
      );
    case "divider":
      return (
        <div style={{ padding: `${block.paddingY}px 0` }}>
          <hr style={{ border: 0, borderTop: `${block.thickness}px solid ${block.color}`, margin: 0 }} />
        </div>
      );
    case "spacer":
      return <div style={{ height: block.height }} />;
    case "columns":
      return (
        <div style={{ padding: `${block.paddingY}px 0` }}>
          <div className="flex" style={{ gap: block.gap }}>
            <div className="flex-1 rounded border border-dashed border-border p-2">
              {block.left.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">Empty column</p>
              )}
              {block.left.map((b) => (
                <div
                  key={b.id}
                  className={`my-1 rounded border ${selectedId === b.id ? "border-primary" : "border-transparent hover:border-border"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChild(b.id);
                  }}
                >
                  <BlockRender block={b} selectedId={selectedId} onSelectChild={onSelectChild} />
                </div>
              ))}
            </div>
            <div className="flex-1 rounded border border-dashed border-border p-2">
              {block.right.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">Empty column</p>
              )}
              {block.right.map((b) => (
                <div
                  key={b.id}
                  className={`my-1 rounded border ${selectedId === b.id ? "border-primary" : "border-transparent hover:border-border"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChild(b.id);
                  }}
                >
                  <BlockRender block={b} selectedId={selectedId} onSelectChild={onSelectChild} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
  }
};

/* ---------------- Inspector ---------------- */

const ColorRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <div className="flex gap-2">
      <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-14 p-1" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    </div>
  </div>
);

const NumberRow = ({
  label,
  value,
  onChange,
  min = 0,
  max = 200,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      className="h-9"
    />
  </div>
);

const AlignmentRow = ({
  value,
  onChange,
}: {
  value: "left" | "center" | "right";
  onChange: (v: "left" | "center" | "right") => void;
}) => (
  <div className="space-y-1">
    <Label className="text-xs">Alignment</Label>
    <Select value={value} onValueChange={(v) => onChange(v as "left" | "center" | "right")}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="left">Left</SelectItem>
        <SelectItem value="center">Center</SelectItem>
        <SelectItem value="right">Right</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const BlockInspector = ({ block, onChange }: { block: Block; onChange: (b: Block) => void }) => {
  switch (block.type) {
    case "heading": {
      const b = block as HeadingBlock;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Text</Label>
            <Textarea value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select
                value={String(b.level)}
                onValueChange={(v) => onChange({ ...b, level: Number(v) as 1 | 2 | 3 })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlignmentRow value={b.alignment} onChange={(v) => onChange({ ...b, alignment: v })} />
          </div>
          <ColorRow label="Color" value={b.color} onChange={(v) => onChange({ ...b, color: v })} />
          <NumberRow label="Padding Y" value={b.paddingY} onChange={(v) => onChange({ ...b, paddingY: v })} max={80} />
        </div>
      );
    }
    case "text": {
      const b = block as TextBlock;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Text</Label>
            <Textarea value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} rows={6} />
          </div>
          <AlignmentRow value={b.alignment} onChange={(v) => onChange({ ...b, alignment: v })} />
          <ColorRow label="Color" value={b.color} onChange={(v) => onChange({ ...b, color: v })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberRow label="Font size" value={b.fontSize} onChange={(v) => onChange({ ...b, fontSize: v })} min={10} max={36} />
            <NumberRow label="Padding Y" value={b.paddingY} onChange={(v) => onChange({ ...b, paddingY: v })} max={80} />
          </div>
        </div>
      );
    }
    case "image": {
      const b = block as ImageBlock;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Image</Label>
            <ImageUploader value={b.src} onChange={(v) => onChange({ ...b, src: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alt text</Label>
            <Input value={b.alt} onChange={(e) => onChange({ ...b, alt: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link URL (optional)</Label>
            <Input value={b.href} onChange={(e) => onChange({ ...b, href: e.target.value })} placeholder="https://" />
          </div>
          <AlignmentRow value={b.alignment} onChange={(v) => onChange({ ...b, alignment: v })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberRow label="Width %" value={b.width} onChange={(v) => onChange({ ...b, width: v })} min={10} max={100} />
            <NumberRow label="Padding Y" value={b.paddingY} onChange={(v) => onChange({ ...b, paddingY: v })} max={80} />
          </div>
        </div>
      );
    }
    case "button": {
      const b = block as ButtonBlock;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Button text</Label>
            <Input value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input value={b.href} onChange={(e) => onChange({ ...b, href: e.target.value })} placeholder="https://" />
          </div>
          <ColorRow label="Background" value={b.background} onChange={(v) => onChange({ ...b, background: v })} />
          <ColorRow label="Text color" value={b.textColor} onChange={(v) => onChange({ ...b, textColor: v })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberRow label="Radius" value={b.radius} onChange={(v) => onChange({ ...b, radius: v })} max={999} />
            <NumberRow label="Padding Y" value={b.paddingY} onChange={(v) => onChange({ ...b, paddingY: v })} max={80} />
          </div>
          <AlignmentRow value={b.alignment} onChange={(v) => onChange({ ...b, alignment: v })} />
        </div>
      );
    }
    case "divider": {
      const b = block as DividerBlock;
      return (
        <div className="space-y-3">
          <ColorRow label="Color" value={b.color} onChange={(v) => onChange({ ...b, color: v })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberRow label="Thickness" value={b.thickness} onChange={(v) => onChange({ ...b, thickness: v })} min={1} max={10} />
            <NumberRow label="Padding Y" value={b.paddingY} onChange={(v) => onChange({ ...b, paddingY: v })} max={80} />
          </div>
        </div>
      );
    }
    case "spacer": {
      const b = block as SpacerBlock;
      return (
        <div className="space-y-3">
          <NumberRow label="Height (px)" value={b.height} onChange={(v) => onChange({ ...b, height: v })} min={4} max={200} />
        </div>
      );
    }
    case "columns": {
      const b = block as ColumnsBlock;
      const addToColumn = (side: "left" | "right", type: BlockType) => {
        onChange({ ...b, [side]: [...b[side], createBlock(type)] } as ColumnsBlock);
      };
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Tip: click a child block in the canvas to edit its individual styles.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <NumberRow label="Gap" value={b.gap} onChange={(v) => onChange({ ...b, gap: v })} max={64} />
            <NumberRow label="Padding Y" value={b.paddingY} onChange={(v) => onChange({ ...b, paddingY: v })} max={80} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Add to left column</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["heading", "text", "image", "button"] as BlockType[]).map((t) => (
                <Button key={t} type="button" variant="outline" size="sm" onClick={() => addToColumn("left", t)}>
                  <Plus className="mr-1 h-3 w-3" />
                  {blockTypeLabels[t]}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Add to right column</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["heading", "text", "image", "button"] as BlockType[]).map((t) => (
                <Button key={t} type="button" variant="outline" size="sm" onClick={() => addToColumn("right", t)}>
                  <Plus className="mr-1 h-3 w-3" />
                  {blockTypeLabels[t]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }
};

const DocumentInspector = ({
  doc,
  onChange,
}: {
  doc: TemplateDocument;
  onChange: (doc: TemplateDocument) => void;
}) => (
  <div className="space-y-3">
    <p className="text-xs text-muted-foreground">Click any block to edit it. These settings apply to the whole email.</p>
    <ColorRow label="Page background" value={doc.background} onChange={(v) => onChange({ ...doc, background: v })} />
    <ColorRow
      label="Content background"
      value={doc.contentBackground}
      onChange={(v) => onChange({ ...doc, contentBackground: v })}
    />
    <NumberRow label="Width (px)" value={doc.width} onChange={(v) => onChange({ ...doc, width: v })} min={400} max={800} />
    <div className="space-y-1">
      <Label className="text-xs">Body font</Label>
      <Select value={doc.fontFamily} onValueChange={(v) => onChange({ ...doc, fontFamily: v })}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Arial, sans-serif">Arial</SelectItem>
          <SelectItem value="Helvetica, Arial, sans-serif">Helvetica</SelectItem>
          <SelectItem value="Georgia, 'Times New Roman', serif">Georgia</SelectItem>
          <SelectItem value="'Courier New', monospace">Courier</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

/* ---------------- Brand themes ---------------- */

const BrandThemesPanel = ({
  doc,
  onChange,
}: {
  doc: TemplateDocument;
  onChange: (doc: TemplateDocument) => void;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BrandTheme> | null>(null);

  const { data: themes = [] } = useQuery({
    queryKey: ["brand-themes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_themes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as BrandTheme[];
    },
    enabled: !!user,
  });

  const saveTheme = useMutation({
    mutationFn: async (t: Partial<BrandTheme>) => {
      if (t.id) {
        const { error } = await supabase
          .from("brand_themes")
          .update({
            name: t.name,
            brand_name: t.brand_name,
            primary_color: t.primary_color,
            background_color: t.background_color,
            heading_font: t.heading_font,
            body_font: t.body_font,
            button_style: t.button_style,
            footer_style: t.footer_style,
          })
          .eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brand_themes").insert({
          user_id: user!.id,
          name: t.name || "Untitled theme",
          brand_name: t.brand_name || "",
          primary_color: t.primary_color || "#111827",
          background_color: t.background_color || "#ffffff",
          heading_font: t.heading_font || "Georgia, 'Times New Roman', serif",
          body_font: t.body_font || "Arial, sans-serif",
          button_style: t.button_style || { radius: 999, textColor: "#ffffff", background: "#111827" },
          footer_style: t.footer_style || { text: "", color: "#6b7280", alignment: "center" },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-themes"] });
      setEditing(null);
      toast.success("Theme saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTheme = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brand_themes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-themes"] });
      toast.success("Theme deleted");
    },
  });

  const apply = (t: BrandTheme) => {
    onChange(applyThemeToDocument(doc, t));
    setOpen(false);
    toast.success(`Applied "${t.name}"`);
  };

  const blank = (): Partial<BrandTheme> => ({
    name: "",
    brand_name: "",
    primary_color: "#111827",
    background_color: "#ffffff",
    heading_font: "Georgia, 'Times New Roman', serif",
    body_font: "Arial, sans-serif",
    button_style: { radius: 999, textColor: "#ffffff", background: "#111827" },
    footer_style: { text: "", color: "#6b7280", alignment: "center" },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <Palette className="mr-2 h-4 w-4" />
          Brand themes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Brand themes</DialogTitle>
        </DialogHeader>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Theme name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Brand name</Label>
                <Input
                  value={editing.brand_name || ""}
                  onChange={(e) => setEditing({ ...editing, brand_name: e.target.value })}
                />
              </div>
              <ColorRow
                label="Primary color"
                value={editing.primary_color || "#111827"}
                onChange={(v) => setEditing({ ...editing, primary_color: v })}
              />
              <ColorRow
                label="Background color"
                value={editing.background_color || "#ffffff"}
                onChange={(v) => setEditing({ ...editing, background_color: v })}
              />
              <div className="space-y-1">
                <Label className="text-xs">Heading font</Label>
                <Select
                  value={editing.heading_font || "Georgia, 'Times New Roman', serif"}
                  onValueChange={(v) => setEditing({ ...editing, heading_font: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Georgia, 'Times New Roman', serif">Georgia (serif)</SelectItem>
                    <SelectItem value="Arial, sans-serif">Arial (sans-serif)</SelectItem>
                    <SelectItem value="Helvetica, Arial, sans-serif">Helvetica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Body font</Label>
                <Select
                  value={editing.body_font || "Arial, sans-serif"}
                  onValueChange={(v) => setEditing({ ...editing, body_font: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="Georgia, 'Times New Roman', serif">Georgia</SelectItem>
                    <SelectItem value="Helvetica, Arial, sans-serif">Helvetica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ColorRow
                label="Button background"
                value={editing.button_style?.background || "#111827"}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    button_style: { ...(editing.button_style || { radius: 999, textColor: "#ffffff", background: "#111827" }), background: v },
                  })
                }
              />
              <ColorRow
                label="Button text color"
                value={editing.button_style?.textColor || "#ffffff"}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    button_style: { ...(editing.button_style || { radius: 999, textColor: "#ffffff", background: "#111827" }), textColor: v },
                  })
                }
              />
              <NumberRow
                label="Button radius"
                value={editing.button_style?.radius ?? 999}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    button_style: { ...(editing.button_style || { radius: 999, textColor: "#ffffff", background: "#111827" }), radius: v },
                  })
                }
                max={999}
              />
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Footer text</Label>
                <Input
                  value={editing.footer_style?.text || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      footer_style: { ...(editing.footer_style || { text: "", color: "#6b7280", alignment: "center" }), text: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => saveTheme.mutate(editing)} disabled={saveTheme.isPending}>
                Save theme
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button type="button" size="sm" onClick={() => setEditing(blank())}>
              <Plus className="mr-2 h-4 w-4" />
              New theme
            </Button>
            {themes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No themes yet. Create one to apply consistent branding.</p>
            ) : (
              <div className="grid gap-2">
                {themes.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="h-6 w-6 rounded" style={{ background: t.primary_color }} />
                        <span className="h-6 w-6 rounded border border-border" style={{ background: t.background_color }} />
                        <span className="h-6 w-6 rounded" style={{ background: t.button_style.background }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.brand_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => apply(t)}>
                        Apply
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTheme.mutate(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- Reusable Sections ---------------- */

type SavedSection = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  blocks: Block[];
  created_at: string;
  updated_at: string;
};

const SectionsPanel = ({
  doc,
  onChange,
}: {
  doc: TemplateDocument;
  onChange: (doc: TemplateDocument) => void;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("custom");
  const [tab, setTab] = useState<"all" | "save">("all");

  const { data: sections = [] } = useQuery({
    queryKey: ["template-sections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_sections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SavedSection[];
    },
    enabled: !!user,
  });

  const saveSection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("template_sections").insert({
        user_id: user!.id,
        name: name || "Untitled section",
        category,
        blocks: doc.blocks as unknown as Block[],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-sections"] });
      setName("");
      setSaveOpen(false);
      toast.success("Section saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("template_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["template-sections"] }),
  });

  const insert = (s: SavedSection) => {
    const cloned = s.blocks.map((b) => cloneBlock(b));
    onChange({ ...doc, blocks: [...doc.blocks, ...cloned] });
    setOpen(false);
    toast.success(`Inserted "${s.name}"`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            <Library className="mr-2 h-4 w-4" />
            Saved sections
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reusable sections</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "save")}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="all">My sections</TabsTrigger>
              <TabsTrigger value="save">Save current</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-2">
              {sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved sections yet. Save your current blocks as a reusable snippet.</p>
              ) : (
                sections.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{s.category}</Badge>
                        <span>{s.blocks.length} block{s.blocks.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => insert(s)}>
                        Insert
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteSection.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="save" className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Section name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hero banner" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero banner</SelectItem>
                    <SelectItem value="cta">CTA section</SelectItem>
                    <SelectItem value="testimonial">Testimonial</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                This will save all {doc.blocks.length} block{doc.blocks.length === 1 ? "" : "s"} from the current canvas.
              </p>
              <Button type="button" onClick={() => saveSection.mutate()} disabled={saveSection.isPending || !name}>
                <Save className="mr-2 h-4 w-4" />
                Save section
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlockEditor;