"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@dokanx/auth";
import {
  Alert,
  AnalyticsCards,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Logo,
  TextInput,
  Toast,
  ToastDescription,
  ToastProvider,
  ToastRegion,
  ToastTitle
} from "@dokanx/ui";

import { createPosOrder, openPosSession, closePosSession, getProductByBarcode } from "@/lib/runtime-api";

import { PosHeader } from "@/components/pos/PosHeader";
import { PosSearch } from "@/components/pos/PosSearch";
import { PosOfferList } from "@/components/pos/PosOfferList";
import { PosCartSummary } from "@/components/pos/PosCartSummary";
import { usePosCart } from "@/hooks/usePosCart";
import { usePosStore } from "@/stores/store-pos";
import { searchProductsAI } from "@/utils/ai-search";

type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
    webkitAudioContext?: typeof AudioContext;
  }
}

export default function PosPage() {
  const tenantId = useAuthStore((state) => state.tenant?.id || "");

  // POS Store
  const {
    sessionId,
    products,
    shops,
    selectedShop,
    customerLocation,
    isLoading,
    error,
    setSessionId,
    setProducts,
    setShops,
    setSelectedShop,
    setCustomerLocation,
    setLoading,
    setError,
  } = usePosStore();

  // Cart Hook
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
  } = usePosCart();

  // Legacy state for barcode scanner (keeping for compatibility)
  const [scannerOpen, setScannerOpen] = useState(false);
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">("success");
  const [scanFlash, setScanFlash] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("Scan error");
  const [toastMessage, setToastMessage] = useState("Unable to scan barcode.");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState("0.08");
  const volumeValue = Math.min(0.2, Math.max(0.02, Number(soundVolume) || 0.08));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  // Load initial data
  useEffect(() => {
    // Mock data - replace with API calls
    setProducts([
      {
        id: "1",
        name: "Rice 1kg",
        price: 120,
        stock: 50,
        shopId: "shop1",
        shopName: "Shop A",
      },
      {
        id: "2",
        name: "Sugar 1kg",
        price: 80,
        stock: 30,
        shopId: "shop1",
        shopName: "Shop A",
      },
      {
        id: "3",
        name: "Milk 1L",
        price: 90,
        stock: 20,
        shopId: "shop2",
        shopName: "Shop B",
      },
    ]);

    setShops([
      {
        id: "shop1",
        name: "Shop A",
        location: { lat: 23.8103, lng: 90.4125 },
        deliveryBase: 30,
        deliveryPerKm: 10,
      },
      {
        id: "shop2",
        name: "Shop B",
        location: { lat: 23.8203, lng: 90.4225 },
        deliveryBase: 25,
        deliveryPerKm: 12,
      },
    ]);
  }, [setProducts, setShops]);

  const stats = useMemo(
    () => [
      { label: "Session", value: sessionId ? "Open" : "Closed", meta: sessionId ? "Ready to bill" : "Open before live sales" },
      { label: "Cart lines", value: String(cart.length), meta: "Current bill lines" },
      { label: "Units", value: String(getCartItemCount()), meta: "Total pieces in cart" },
      { label: "Subtotal", value: `৳${getCartTotal().toFixed(2)}`, meta: "Current POS basket" },
      { label: "Scanner", value: scannerOpen ? "Live" : "Idle", meta: "Camera barcode state" },
      { label: "Sound", value: soundEnabled ? "On" : "Muted", meta: `Volume ${Math.round((volumeValue / 0.2) * 100)}%` },
    ],
    [cart.length, getCartItemCount, getCartTotal, scannerOpen, sessionId, soundEnabled, volumeValue],
  );
