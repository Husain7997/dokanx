import { create } from "zustand";

export type TenantShop = {
  id: string;
  name: string;
  domain?: string | null;
  slug?: string | null;
};

type TenantState = {
  shop: TenantShop | null;
  setShop: (shop: TenantShop | null) => void;
};

export const useTenantStore = create<TenantState>((set) => ({
  shop: null,
  setShop: (shop) => set({ shop }),
}));
