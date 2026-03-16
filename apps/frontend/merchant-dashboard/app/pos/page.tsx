"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@dokanx/auth";

import { createPosOrder, openPosSession, closePosSession, getProductByBarcode } from "@/lib/runtime-api";

export default function PosPage() {
  const tenantId = useAuthStore((state) => state.tenant?.id || "");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<Array<{ product: string; name: string; price: number; quantity: number }>>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function handleOpenSession() {
    const response = await openPosSession({ openingBalance: 0 });
    setSessionId(response.data?._id || null);
    setStatus("POS session opened.");
  }

  async function handleCloseSession() {
    if (!sessionId) return;
    await closePosSession(sessionId, { closingBalance: 0 });
    setSessionId(null);
    setStatus("POS session closed.");
  }

  async function handleCreateOrder() {
    const items = cart.length
      ? cart.map((item) => ({ product: item.product, quantity: item.quantity }))
      : [{ product: productId, quantity: Math.max(1, Number(quantity) || 1) }];

    const response = await createPosOrder({ items });
    setStatus(`POS order created: ${response.data?._id || ""}`);
    setCart([]);
  }

  async function handleBarcodeLookup(value: string) {
    if (!value || !tenantId) return;
    try {
      const response = await getProductByBarcode(value, tenantId);
      const product = response.data as { _id?: string; name?: string; price?: number } | undefined;
      if (!product?._id) return;
      setCart((current) => {
        const existing = current.find((item) => item.product === product._id);
        if (existing) {
          return current.map((item) =>
            item.product === product._id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...current, { product: product._id, name: product.name || "Item", price: product.price || 0, quantity: 1 }];
      });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Barcode lookup failed");
    }
  }

  async function handleSkuLookup() {
    if (!sku || !tenantId) return;
    await handleBarcodeLookup(sku);
  }

  useEffect(() => {
    async function startScanner() {
      if (!scannerOpen) return;
      if (!("BarcodeDetector" in window)) {
        setStatus("Barcode scanning not supported in this browser.");
        setScannerOpen(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new (window as unknown as { BarcodeDetector: typeof BarcodeDetector }).BarcodeDetector({
          formats: ["qr_code", "code_128", "ean_13", "ean_8"],
        });

        const scan = async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length) {
              const value = barcodes[0]?.rawValue || "";
              if (value) {
                setBarcode(value);
                await handleBarcodeLookup(value);
                setScannerOpen(false);
                return;
              }
            }
          } catch {
            // ignore scan errors
          }
          scanRef.current = requestAnimationFrame(scan);
        };

        scanRef.current = requestAnimationFrame(scan);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Camera access denied");
        setScannerOpen(false);
      }
    }

    void startScanner();

    return () => {
      if (scanRef.current) cancelAnimationFrame(scanRef.current);
      scanRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [scannerOpen]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">POS</p>
        <h1 className="dx-display text-3xl">Point of Sale</h1>
        <p className="text-sm text-muted-foreground">Open sessions, take orders, and sync inventory.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Session control</p>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
            onClick={handleOpenSession}
            disabled={!!sessionId}
          >
            Open session
          </button>
          <button
            className="rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
            onClick={handleCloseSession}
            disabled={!sessionId}
          >
            Close session
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Active session: {sessionId || "None"}</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
        <p className="text-sm font-semibold text-foreground">Create POS order</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Barcode (scan input)"
            value={barcode}
            onChange={(event) => {
              const value = event.target.value;
              setBarcode(value);
              if (value.length >= 8) {
                void handleBarcodeLookup(value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleBarcodeLookup(barcode);
              }
            }}
          />
          <button
            className="w-fit rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground md:col-span-2"
            onClick={() => setScannerOpen(true)}
          >
            Open camera scanner
          </button>
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Product ID"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="SKU / Barcode manual"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSkuLookup();
              }
            }}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Quantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <button
          className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
          onClick={handleCreateOrder}
        >
          Create order
        </button>
        <button
          className="w-fit rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
          onClick={handleSkuLookup}
        >
          Add by SKU
        </button>
        {cart.length ? (
          <div className="grid gap-2 text-xs text-muted-foreground">
            {cart.map((item) => (
              <div key={item.product} className="flex items-center justify-between">
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-white/60 bg-white px-2 py-0.5 text-xs"
                    onClick={() =>
                      setCart((current) =>
                        current
                          .map((entry) =>
                            entry.product === item.product
                              ? { ...entry, quantity: Math.max(1, entry.quantity - 1) }
                              : entry
                          )
                          .filter((entry) => entry.quantity > 0)
                      )
                    }
                  >
                    -
                  </button>
                  <span>
                    {item.quantity} x {item.price}
                  </span>
                  <button
                    className="rounded-full border border-white/60 bg-white px-2 py-0.5 text-xs"
                    onClick={() =>
                      setCart((current) =>
                        current.map((entry) =>
                          entry.product === item.product
                            ? { ...entry, quantity: entry.quantity + 1 }
                            : entry
                        )
                      )
                    }
                  >
                    +
                  </button>
                  <button
                    className="rounded-full border border-white/60 bg-white px-2 py-0.5 text-xs"
                    onClick={() =>
                      setCart((current) => current.filter((entry) => entry.product !== item.product))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {scannerOpen ? (
        <div className="grid gap-3 rounded-3xl border border-white/40 bg-white/70 p-6">
          <p className="text-sm font-semibold text-foreground">Scanner</p>
          <video ref={videoRef} className="w-full rounded-2xl border border-white/60" muted playsInline />
          <button
            className="w-fit rounded-full border border-white/60 bg-white px-4 py-2 text-xs font-semibold text-foreground"
            onClick={() => setScannerOpen(false)}
          >
            Close scanner
          </button>
        </div>
      ) : null}

      {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
    </div>
  );
}
