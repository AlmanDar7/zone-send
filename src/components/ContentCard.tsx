import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface ContentCardProps {
  title: string;
  statusLabel: string;
  preview?: ReactNode;
  previewTitle?: string;
  previewSubtitle?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const ContentCard = ({
  title,
  statusLabel,
  preview,
  previewTitle,
  previewSubtitle,
  onClick,
  selected,
  className,
}: ContentCardProps) => {
  const cardClass = cn(
    "group w-full overflow-hidden rounded-lg bg-card text-left shadow-sm transition-shadow hover:shadow-md",
    onClick && "cursor-pointer",
    selected && "ring-2 ring-primary ring-offset-2",
    className,
  );

  const body = (
    <>
      <div className="relative flex aspect-[4/3] flex-col items-center justify-end overflow-hidden bg-primary px-6 pb-0 pt-8 text-center">
        {previewSubtitle && (
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
            {previewSubtitle}
          </p>
        )}
        {previewTitle && (
          <h3 className="font-serif text-2xl font-semibold uppercase leading-tight tracking-wide text-white sm:text-3xl">
            {previewTitle}
          </h3>
        )}
        {preview ?? (
          <div className="mt-6 flex w-full max-w-[140px] flex-col items-center">
            <div className="flex h-24 w-full items-center justify-center rounded-t-[999px] bg-white/95">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2 px-4 py-4">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {statusLabel}
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cardClass} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <article className={cardClass}>{body}</article>;
};

export default ContentCard;
