import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Palette, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VisualTemplateConfig, TemplateVariableValues } from "@/lib/template-presets";
import { replaceTemplateVariables } from "@/lib/template-presets";
import {
  normalizeSectionOrder,
  visualSectionMeta,
  type VisualSectionId,
} from "@/lib/visual-template-sections";
import VisualSectionEditDialog from "@/components/VisualSectionEditDialog";

type Props = {
  config: VisualTemplateConfig;
  variables?: Partial<TemplateVariableValues>;
  onConfigChange: (config: VisualTemplateConfig) => void;
  onUpdateField: <K extends keyof VisualTemplateConfig>(
    key: K,
    value: VisualTemplateConfig[K],
  ) => void;
};

const VisualTemplateCanvas = ({ config, variables, onConfigChange, onUpdateField }: Props) => {
  const [selectedId, setSelectedId] = useState<VisualSectionId | null>(null);
  const [editingId, setEditingId] = useState<VisualSectionId | null>(null);

  const sectionOrder = useMemo(
    () => normalizeSectionOrder(config.sectionOrder),
    [config.sectionOrder],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionOrder.indexOf(active.id as VisualSectionId);
    const newIndex = sectionOrder.indexOf(over.id as VisualSectionId);
    if (oldIndex < 0 || newIndex < 0) return;
    onConfigChange({
      ...config,
      sectionOrder: arrayMove(sectionOrder, oldIndex, newIndex),
    });
  };

  const openEditor = (id: VisualSectionId) => {
    setSelectedId(id);
    setEditingId(id);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Double-click</span> a section to edit ·{" "}
            <span className="font-medium text-foreground">Drag</span> the handle to reorder
          </p>
          <button
            type="button"
            onClick={() => openEditor("style")}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Palette className="h-3.5 w-3.5" />
            Colors
          </button>
        </div>

        <div
          className="rounded-2xl border border-border p-4 sm:p-6"
          style={{ backgroundColor: config.backgroundColor }}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              <div className="mx-auto max-w-md space-y-0">
                {sectionOrder.map((sectionId) => (
                  <SortableSection
                    key={sectionId}
                    sectionId={sectionId}
                    config={config}
                    variables={variables}
                    selected={selectedId === sectionId}
                    onSelect={() => setSelectedId(sectionId)}
                    onEdit={() => openEditor(sectionId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <VisualSectionEditDialog
        sectionId={editingId}
        config={config}
        open={!!editingId}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        onUpdate={onUpdateField}
        onClose={() => setEditingId(null)}
      />
    </>
  );
};

type SortableSectionProps = {
  sectionId: VisualSectionId;
  config: VisualTemplateConfig;
  variables?: Partial<TemplateVariableValues>;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
};

const SortableSection = ({
  sectionId,
  config,
  variables,
  selected,
  onSelect,
  onEdit,
}: SortableSectionProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const meta = visualSectionMeta[sectionId];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group relative py-1", isDragging && "z-20 opacity-90")}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onDoubleClick={(e) => {
          e.preventDefault();
          onEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEdit();
        }}
        className={cn(
          "relative rounded-xl border-2 bg-white/95 transition-all",
          selected ? "border-primary shadow-md ring-2 ring-primary/20" : "border-transparent hover:border-primary/40",
          "cursor-pointer",
        )}
      >
        <div className="absolute -left-1 top-3 flex -translate-x-full items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="flex h-8 w-7 cursor-grab items-center justify-center rounded-l-md border border-border bg-card text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {meta.label}
          </span>
          <Pencil className="h-3 w-3 text-primary" />
        </div>

        <SectionPreview sectionId={sectionId} config={config} variables={variables} />
      </div>
    </div>
  );
};

const SectionPreview = ({
  sectionId,
  config,
  variables,
}: {
  sectionId: VisualSectionId;
  config: VisualTemplateConfig;
  variables?: Partial<TemplateVariableValues>;
}) => {
  const t = (value: string) => replaceTemplateVariables(value, variables);

  switch (sectionId) {
    case "brand":
      return (
        <div className="px-4 pb-2 pt-4 text-center">
          <span className="inline-block rounded-full border border-border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground">
            {t(config.brandName)}
          </span>
        </div>
      );
    case "eyebrow":
      return (
        <p className="px-6 pb-2 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t(config.eyebrow)}
        </p>
      );
    case "hero":
      return (
        <div className="px-4 pb-3">
          <img
            src={config.heroImageUrl}
            alt=""
            className="h-40 w-full rounded-2xl object-cover"
          />
        </div>
      );
    case "headline":
      return (
        <h3 className="px-6 pb-2 text-center font-serif text-2xl font-medium leading-tight text-foreground">
          {t(config.headline)}
        </h3>
      );
    case "subheadline":
      return (
        <p className="px-6 pb-3 text-center text-sm leading-relaxed text-muted-foreground">
          {t(config.subheadline)}
        </p>
      );
    case "body":
      return (
        <div className="whitespace-pre-wrap px-6 pb-4 text-center text-sm leading-relaxed text-foreground">
          {t(config.body)}
        </div>
      );
    case "cta":
      return (
        <div className="px-6 pb-4 text-center">
          <span
            className="inline-block rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-wide text-foreground"
            style={{ backgroundColor: config.accentColor }}
          >
            {t(config.ctaText)}
          </span>
        </div>
      );
    case "secondary":
      return (
        <div className="mx-4 mb-4 rounded-2xl bg-muted/60 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t(config.secondaryTitle)}
          </p>
          <p className="mt-2 text-sm text-foreground">{t(config.secondaryBody)}</p>
        </div>
      );
    case "footer":
      return (
        <p className="px-6 pb-4 text-center text-xs leading-relaxed text-muted-foreground">
          {t(config.footerNote)}
        </p>
      );
    default:
      return null;
  }
};

export default VisualTemplateCanvas;
