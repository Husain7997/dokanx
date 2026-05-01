import { Card, CardContent, CardTitle, Badge } from "@dokanx/ui";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  shopId: string;
  shopName: string;
  image?: string;
}

interface PosOfferListProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  selectedShop?: string;
}

export function PosOfferList({ products, onProductSelect, selectedShop }: PosOfferListProps) {
  const filteredProducts = selectedShop
    ? products.filter(p => p.shopId === selectedShop)
    : products;

  if (filteredProducts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        No products available for the selected shop.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {filteredProducts.map((product) => (
        <Card
          key={product.id}
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => onProductSelect(product)}
        >
          <CardContent className="p-4">
            {product.image && (
              <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-muted">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <CardTitle className="mb-2 text-sm">{product.name}</CardTitle>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary">৳{product.price}</span>
              <Badge variant={product.stock > 0 ? "success" : "danger"}>
                {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{product.shopName}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}