import { Badge, Button, Card, CardDescription, CardTitle, PriceTag } from "@dokanx/ui";
import Link from "next/link";
import { headers } from "next/headers";

import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { StorefrontProductGrid } from "@/components/storefront-product-grid";
import { getProductBySlug, getProductsData, getShopBySlug } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const product = await getProductBySlug(tenant, slug);
  if (!product) {
    return (
      <Card className="border-dashed border-border/70 bg-card/60">
        <CardTitle>Product not found</CardTitle>
        <CardDescription className="mt-2">Try searching for a different product.</CardDescription>
      </Card>
    );
  }

  const shop = product.shopId ? await getShopBySlug(String(product.shopId)) : null;
  const similarProducts = await getProductsData(tenant, {
    limit: "8",
    category: product.category || "",
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="grid gap-6">
        <Card className="overflow-hidden p-0">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="bg-accent">
              <img
                src={product.image || "https://placehold.co/800x800"}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                {product.category ? <Badge>{product.category}</Badge> : null}
                {product.stock === 0 ? <Badge variant="danger">Out of stock</Badge> : null}
              </div>
              <CardTitle className="mt-4 text-2xl">{product.name}</CardTitle>
              <div className="mt-3 flex items-center gap-3">
                <PriceTag amount={product.price || 0} />
                <Badge variant="success">10% off</Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Fast delivery, easy returns, and verified shop inventory.
              </p>
              <div className="mt-6 grid gap-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stock</span>
                  <span className="font-semibold">{product.stock ?? 0} available</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-semibold">4.7 ★</span>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/cart">Buy now</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Shop information</CardTitle>
          <CardDescription className="mt-2">
            {shop?.name || "Shop"} • {shop?.domain || shop?.slug || "Marketplace partner"}
          </CardDescription>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="success">Verified shop</Badge>
            <Badge variant="neutral">Same day delivery</Badge>
            <Badge variant="neutral">Return policy</Badge>
          </div>
          {shop?.slug ? (
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href={`/shop/${shop.slug}`}>Visit shop</Link>
              </Button>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardTitle>Reviews</CardTitle>
          <CardDescription className="mt-2">Real customer feedback for this product.</CardDescription>
          <div className="mt-6 grid gap-4">
            {[
              ["Great quality", "Fast delivery and sturdy packaging."],
              ["Worth the price", "Product matched the description perfectly."],
              ["Repeat purchase", "Second time buying and still happy."],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-2xl border border-border/60 p-4">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardTitle>Buy now</CardTitle>
          <CardDescription className="mt-2">Secure checkout with multiple payment options.</CardDescription>
          <div className="mt-6">
            <ProductPurchasePanel product={product} />
          </div>
        </Card>

        <Card>
          <CardTitle>Delivery promise</CardTitle>
          <CardDescription className="mt-2">Delivery within 2-3 days across Bangladesh.</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <span>Cash on Delivery</span>
            <span>Wallet & online payments</span>
            <span>7-day return window</span>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <CardTitle>Similar products</CardTitle>
        <div className="mt-6">
          <StorefrontProductGrid products={similarProducts.slice(0, 8)} />
        </div>
      </div>
    </div>
  );
}
