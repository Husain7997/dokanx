import { create } from "zustand";

import { STORAGE_KEYS } from "../../../shared/constants";
import { clearJsonValue, getJsonValue, saveJsonValue } from "../../../shared/secure-storage";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shop?: string;
  location?: string;
  productId: string;
};

type CartState = {
  items: CartItem[];
  guestToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setGuestToken: (token: string | null) => void;
  setItems: (items: CartItem[]) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

async function persistCart(next: { items: CartItem[]; guestToken: string | null }) {
  if (!next.items.length && !next.guestToken) {
    await clearJsonValue(STORAGE_KEYS.cartService);
    return;
  }
  await saveJsonValue(STORAGE_KEYS.cartService, next);
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  guestToken: null,
  isHydrated: false,
  hydrate: async () => {
    const persisted = await getJsonValue<{ items?: CartItem[]; guestToken?: string | null }>(STORAGE_KEYS.cartService);
    set({
      items: Array.isArray(persisted?.items) ? persisted.items : [],
      guestToken: typeof persisted?.guestToken === "string" ? persisted.guestToken : null,
      isHydrated: true,
    });
  },
  setGuestToken: (token) => {
    const next = { items: get().items, guestToken: token };
    set({ guestToken: token });
    void persistCart(next);
  },
  setItems: (items) => {
    const next = { items, guestToken: get().guestToken };
    set({ items });
    void persistCart(next);
  },
  addItem: (item) => {
    const quantity = Math.max(1, item.quantity ?? 1);
    const existing = get().items.find((entry) => entry.id === item.id);
    const items = existing
      ? get().items.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + quantity } : entry
        )
      : [...get().items, { ...item, quantity }];
    set({ items });
    void persistCart({ items, guestToken: get().guestToken });
  },
  updateQuantity: (id, quantity) => {
    const items = get().items.map((entry) =>
      entry.id === id ? { ...entry, quantity: Math.max(1, quantity) } : entry
    );
    set({ items });
    void persistCart({ items, guestToken: get().guestToken });
  },
  removeItem: (id) => {
    const items = get().items.filter((entry) => entry.id !== id);
    set({ items });
    void persistCart({ items, guestToken: get().guestToken });
  },
  clear: () => {
    set({ items: [], guestToken: null });
    void clearJsonValue(STORAGE_KEYS.cartService);
  },
}));
