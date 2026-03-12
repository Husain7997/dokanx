import { cn } from "../../lib/utils";

export function CheckoutSteps({
  steps,
  currentStep
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <ol className="grid gap-4 md:grid-cols-4">
      {steps.map((step, index) => {
        const active = index <= currentStep;

        return (
          <li
            key={step}
            className={cn(
              "rounded-[var(--radius-lg)] border p-4 text-sm",
              active ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="block text-xs uppercase tracking-[0.18em]">Step {index + 1}</span>
            <span className="mt-2 block font-medium">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

export const CheckoutStepper = CheckoutSteps;
