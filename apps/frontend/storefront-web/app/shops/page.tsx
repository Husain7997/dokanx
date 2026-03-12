import { ShopCard } from "@dokanx/ui";

import { getShopsDirectory } from "@/lib/server-data";

export default async function ShopsPage() {
  const shops = await getShopsDirectory();

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {shops.map((shop) => (
        <ShopCard
          key={shop.slug}
          name={shop.name}
          description={shop.description}
          rating={shop.rating}
          verified={shop.verified}
        />
      ))}
    </div>
  );
}
