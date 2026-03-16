import { create } from "zustand";

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
  setGuestToken: (token: string | null) => void;
  setItems: (items: CartItem[]) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  guestToken: null,
  setGuestToken: (token) => set({ guestToken: token }),
  setItems: (items) => set({ items }),
  addItem: (item) => {
    const quantity = Math.max(1, item.quantity ?? 1);
    const existing = get().items.find((entry) => entry.id === item.id);
    if (existing) {
      set({
        items: get().items.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        ),
      });
      return;
    }

    set({
      items: [...get().items, { ...item, quantity }],
    });
  },
  updateQuantity: (id, quantity) => {
    set({
      items: get().items.map((entry) =>
        entry.id === id ? { ...entry, quantity: Math.max(1, quantity) } : entry
      ),
    });
  },
  removeItem: (id) => {
    set({ items: get().items.filter((entry) => entry.id !== id) });
  },
  clear: () => set({ items: [] }),
}));
