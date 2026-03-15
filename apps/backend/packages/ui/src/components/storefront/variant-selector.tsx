import { cn } from "../../lib/utils";

export function VariantSelector({
  options,
  selected
}: {
  options: string[];
  selected?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition",
            selected === option
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card hover:bg-accent"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
