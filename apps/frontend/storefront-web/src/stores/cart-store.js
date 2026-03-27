import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
function buildShopCart(items) {
    return {
        items,
        subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };
}
export const useCartStore = create()(persist((set) => ({
    cart: {},
    hydrateShop: (shopId, items) => set((state) => ({
        cart: {
            ...state.cart,
            [shopId]: buildShopCart(items),
        },
    })),
    addItem: (shopId, item) => set((state) => {
        const current = state.cart[shopId]?.items || [];
        const next = [...current];
        const existing = next.find((row) => row.productId === item.productId);
        if (existing) {
            existing.quantity += item.quantity;
        }
        else {
            next.push(item);
        }
        return {
            cart: {
                ...state.cart,
                [shopId]: buildShopCart(next),
            },
        };
    }),
    updateQuantity: (shopId, productId, quantity) => set((state) => {
        const current = state.cart[shopId]?.items || [];
        const next = current
            .map((item) => (item.productId === productId ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0);
        return {
            cart: {
                ...state.cart,
                [shopId]: buildShopCart(next),
            },
        };
    }),
    removeItem: (shopId, productId) => set((state) => {
        const current = state.cart[shopId]?.items || [];
        const next = current.filter((item) => item.productId !== productId);
        return {
            cart: {
                ...state.cart,
                [shopId]: buildShopCart(next),
            },
        };
    }),
    clearShop: (shopId) => set((state) => {
        const next = { ...state.cart };
        delete next[shopId];
        return { cart: next };
    }),
    clearAll: () => set({ cart: {} }),
}), {
    name: "dokanx-cart-store",
    storage: createJSONStorage(() => localStorage),
}));
