const FormPreviewThumb = ({ title }: { title?: string }) => (
  <div className="mt-4 flex w-full max-w-[160px] flex-col items-center">
    <div className="w-full rounded-t-2xl bg-white/95 px-4 pb-4 pt-5 shadow-sm">
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-wide text-foreground/70">
        {title ? title.slice(0, 28) : "Sign up"}
      </p>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-muted" />
        <div className="h-2 w-full rounded-full bg-muted" />
        <div className="mx-auto mt-3 h-6 w-20 rounded-md bg-primary/80" />
      </div>
    </div>
  </div>
);

export default FormPreviewThumb;
