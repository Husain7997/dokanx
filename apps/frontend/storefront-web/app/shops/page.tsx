import { getShopsDirectory } from "@/lib/server-data";
import { ShopsMapWorkspace } from "@/components/shops-map-workspace";

export default async function ShopsPage() {
  const shops = await getShopsDirectory();

  return <ShopsMapWorkspace initialShops={shops} />;
}
