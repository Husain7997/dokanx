import type { CartPanelItem } from "./cart-panel";

import { CartPanel } from "./cart-panel";
import { Drawer, DrawerContent } from "../ui/drawer";

export function CartDrawer({
  open,
  items
}: {
  open?: boolean;
  items: CartPanelItem[];
}) {
  return (
    <Drawer open={open}>
      <DrawerContent>
        <CartPanel items={items} />
      </DrawerContent>
    </Drawer>
  );
}
