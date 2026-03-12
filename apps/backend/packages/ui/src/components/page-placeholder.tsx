type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({
  title,
  description
}: PagePlaceholderProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
