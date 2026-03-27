import { create } from "zustand";

import { STORAGE_KEYS } from "../../../shared/constants";
import { clearJsonValue, getJsonValue, saveJsonValue } from "../../../shared/secure-storage";

export type TenantShop = {
  id: string;
  name: string;
  domain?: string | null;
  slug?: string | null;
  lat?: number | null;
  lng?: number | null;
  category?: string | null;
  ratingAverage?: number | null;
};

export const DEMO_CUSTOMER_SHOP: TenantShop = {
  id: "demo-shop-1",
  name: "DokanX Demo Store",
  domain: "dokanx.local",
  slug: "dokanx-demo-store",
  category: "Groceries",
  ratingAverage: 4.8,
  lat: 23.8103,
  lng: 90.4125,
};

type TenantState = {
  shop: TenantShop | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setShop: (shop: TenantShop | null) => void;
};

export const useTenantStore = create<TenantState>((set) => ({
  shop: null,
  isHydrated: false,
  hydrate: async () => {
    const shop = await getJsonValue<TenantShop | null>(STORAGE_KEYS.shopService);
    set({ shop: shop || DEMO_CUSTOMER_SHOP, isHydrated: true });
  },
  setShop: (shop) => {
    const nextShop = shop || DEMO_CUSTOMER_SHOP;
    set({ shop: nextShop });
    void saveJsonValue(STORAGE_KEYS.shopService, nextShop);
    if (!shop) {
      void clearJsonValue(STORAGE_KEYS.shopService);
    }
  },
}));
