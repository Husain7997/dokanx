import { Button } from "../ui/button";

export function QuantitySelector({
  value
}: {
  value: number;
}) {
  return (
    <div className="inline-flex items-center rounded-[var(--radius-md)] border bg-card">
      <Button type="button" variant="ghost" className="rounded-r-none">-</Button>
      <span className="min-w-10 text-center text-sm">{value}</span>
      <Button type="button" variant="ghost" className="rounded-l-none">+</Button>
    </div>
  );
}
