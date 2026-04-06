import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Children, type ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:brightness-95",
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:brightness-95",
        secondary: "border border-border bg-card text-card-foreground hover:bg-accent/10 hover:text-foreground",
        danger:
          "bg-[hsl(var(--destructive))] text-white shadow-[var(--shadow-sm)] hover:brightness-95",
        outline:
          "border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

type ButtonType = "button" | "submit" | "reset" | "primary" | "secondary";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingText?: string;
    type?: ButtonType;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText = "Loading",
  type = "button",
  ...props
}: ButtonProps) {
  const childCount = Children.count(props.children);
  const useSlot = asChild && childCount === 1 && !loading;
  const Comp = useSlot ? Slot : "button";
  const visualVariant = variant ?? (type === "secondary" ? "secondary" : type === "primary" ? "primary" : "primary");
  const nativeType = type === "submit" || type === "reset" || type === "button" ? type : "button";
  const spinnerClass =
    visualVariant === "primary" || visualVariant === "default" || visualVariant === "danger"
      ? "h-4 w-4 border-white/40 border-t-white"
      : "h-4 w-4 border-primary/30 border-t-primary";

  return (
    <Comp
      className={cn(buttonVariants({ variant: visualVariant, size }), className)}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
      {...(!useSlot ? { type: nativeType } : {})}
      {...props}
    >
      {loading ? <Spinner className={spinnerClass} label={loadingText} /> : null}
      {props.children}
    </Comp>
  );
}
