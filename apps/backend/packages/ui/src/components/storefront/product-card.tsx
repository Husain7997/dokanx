import { HoverLift } from "../../motion/presets";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardTitle } from "../ui/card";
import { PriceTag } from "./price-tag";
import { StockIndicator } from "./stock-indicator";

export type ProductCardProps = {
  title: string;
  price: number;
  image: string;
  category?: string;
  status?: string;
  inStock?: boolean;
};

export function ProductCard({
  title,
  price,
  image,
  category,
  status,
  inStock = true
}: ProductCardProps) {
  return (
    <HoverLift>
      <Card className="overflow-hidden p-0">
        <div className="aspect-[4/3] bg-accent">
          <img src={image} alt={title} className="h-full w-full object-cover" />
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            {category ? <Badge>{category}</Badge> : <span />}
            {status ? <Badge variant="success">{status}</Badge> : null}
          </div>
          <CardTitle className="mt-4">{title}</CardTitle>
          <div className="mt-2">
            <PriceTag amount={price} />
          </div>
          <div className="mt-3">
            <StockIndicator inStock={inStock} />
          </div>
          <Button className="mt-5 w-full" variant="outline">
            View Product
          </Button>
        </div>
      </Card>
    </HoverLift>
  );
}
