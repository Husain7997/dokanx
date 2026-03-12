import {
  AddToCartButton,
  Card,
  CardDescription,
  CardTitle,
  PriceTag,
  ProductGallery,
  VariantSelector
} from "@dokanx/ui";
import { headers } from "next/headers";

import { getProductBySlug } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const tenant = getTenantConfig((await headers()).get("host") || "localhost:3000");
  const slug = (await params).slug;
  const product = await getProductBySlug(tenant, slug);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <ProductGallery
        items={[
          { src: product.image || "https://placehold.co/1200x900", alt: product.name || slug },
          { src: product.image || "https://placehold.co/600x600", alt: product.name || slug },
          { src: product.image || "https://placehold.co/600x600", alt: product.name || slug }
        ]}
      />
      <Card>
        <CardTitle>{product.name || slug}</CardTitle>
        <CardDescription className="mt-2">
          {product.description || "Product detail is connected to the backend catalog layer."}
        </CardDescription>
        <div className="mt-6">
          <PriceTag amount={product.price || 0} />
        </div>
        <div className="mt-6">
          <VariantSelector options={["Default", "Premium", "Bundle"]} selected="Default" />
        </div>
        <div className="mt-6">
          <AddToCartButton />
        </div>
      </Card>
    </div>
  );
}
