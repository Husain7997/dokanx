import type { ProductCardProps } from "./product-card";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: ProductCardProps[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={`${product.title}-${product.price}`} {...product} />
      ))}
    </div>
  );
}
