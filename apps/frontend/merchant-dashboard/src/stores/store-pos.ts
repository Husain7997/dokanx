import { create } from "zustand";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  shopId: string;
  shopName: string;
  image?: string;
}

interface Shop {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  deliveryBase: number;
  deliveryPerKm: number;
}

interface PosState {
  sessionId: string | null;
  products: Product[];
  shops: Shop[];
  selectedShop: string | null;
  customerLocation: { lat: number; lng: number } | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSessionId: (id: string | null) => void;
  setProducts: (products: Product[]) => void;
  setShops: (shops: Shop[]) => void;
  setSelectedShop: (shopId: string | null) => void;
  setCustomerLocation: (location: { lat: number; lng: number } | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePosStore = create<PosState>((set) => ({
  sessionId: null,
  products: [],
  shops: [],
  selectedShop: null,
  customerLocation: null,
  isLoading: false,
  error: null,

  setSessionId: (sessionId) => set({ sessionId }),
  setProducts: (products) => set({ products }),
  setShops: (shops) => set({ shops }),
  setSelectedShop: (selectedShop) => set({ selectedShop }),
  setCustomerLocation: (customerLocation) => set({ customerLocation }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));