import { HoverLift } from "../../motion/presets";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardTitle } from "../ui/card";
import { PriceTag } from "./price-tag";
import { StockIndicator } from "./stock-indicator";
import type { ReactNode } from "react";

export type ProductCardProps = {
  title: string;
  price: number;
  image: string;
  category?: string;
  status?: string;
  inStock?: boolean;
  discountLabel?: string;
  rating?: number;
  ratingCount?: number;
  ctaLabel?: string;
  onAddToCart?: () => void;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  statusVariant?: "success" | "warning" | "danger" | "neutral";
  originalPrice?: number;
};

export function ProductCard({
  title,
  price,
  image,
  category,
  status,
  inStock = true,
  discountLabel,
  rating,
  ratingCount,
  ctaLabel = "Add to Cart",
  onAddToCart,
  primaryAction,
  secondaryAction,
  statusVariant,
  originalPrice
}: ProductCardProps) {
  const resolvedStatusVariant =
    statusVariant ?? (inStock ? "success" : "danger");
  const showOriginal = typeof originalPrice === "number" && originalPrice > price;
  return (
    <HoverLift>
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-[4/3] bg-accent">
          <img src={image} alt={title} className="h-full w-full object-cover" />
          {discountLabel ? (
            <span className="absolute left-3 top-3 rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-xs font-semibold text-[hsl(var(--accent-foreground))]">
              {discountLabel}
            </span>
          ) : null}
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            {category ? <Badge>{category}</Badge> : <span />}
            {status ? <Badge variant={resolvedStatusVariant}>{status}</Badge> : null}
          </div>
          <CardTitle className="mt-4">{title}</CardTitle>
          {typeof rating === "number" ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <svg
                    key={`star-${index}`}
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill={index < Math.round(rating) ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 3.5l2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.3 6-.9L12 3.5z" />
                  </svg>
                ))}
              </div>
              <span>
                {rating.toFixed(1)}
                {ratingCount ? ` (${ratingCount})` : ""}
              </span>
            </div>
          ) : null}
          <div className="mt-2">
            <PriceTag amount={price} compareAt={showOriginal ? originalPrice : undefined} />
          </div>
          <div className="mt-3">
            <StockIndicator inStock={inStock} />
          </div>
          <div className="mt-5 grid gap-2">
            {primaryAction ?? (
              <Button className="w-full" variant="primary" onClick={onAddToCart}>
                {ctaLabel}
              </Button>
            )}
            {secondaryAction ? secondaryAction : null}
          </div>
        </div>
      </Card>
    </HoverLift>
  );
}
