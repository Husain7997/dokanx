"use client";

import dynamic from "next/dynamic";

type ShopDirectoryItem = {
  slug: string;
  name: string;
  description: string;
  rating: string;
  verified: boolean;
  district: string;
  thana: string;
  market: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
};

const ShopsMapWorkspace = dynamic(
  () => import("@/components/shops-map-workspace").then((mod) => mod.ShopsMapWorkspace),
  { ssr: false }
);

export function MapPageClient({ initialShops }: { initialShops: ShopDirectoryItem[] }) {
  return <ShopsMapWorkspace initialShops={initialShops} />;
}
