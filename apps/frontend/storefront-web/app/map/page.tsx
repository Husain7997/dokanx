import { headers } from "next/headers";

import { MapPageClient } from "./map-page-client";
import { getShopsDirectory } from "@/lib/server-data";
import { getTenantConfig } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  getTenantConfig((await headers()).get("host") || "localhost:3000");
  const shops = await getShopsDirectory();
  return <MapPageClient initialShops={shops} />;
}
