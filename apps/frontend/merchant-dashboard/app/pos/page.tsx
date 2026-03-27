"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@dokanx/auth";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  TextInput,
  Toast,
  ToastDescription,
  ToastProvider,
  ToastRegion,
  ToastTitle
} from "@dokanx/ui";

import { createPosOrder, openPosSession, closePosSession, getProductByBarcode } from "@/lib/runtime-api";

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<Array<{ product: string; name: string; price: number; quantity: number }>>([]);
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

  async function handleOpenSession() {
    const response = await openPosSession({ openingBalance: 0 });
    setSessionId(typeof response.data?._id === "string" ? response.data._id : null);
    setStatusTone("success");
    setStatus("POS session opened.");
  }

  async function handleCloseSession() {
    if (!sessionId) return;
    await closePosSession(sessionId, { closingBalance: 0 });
    setSessionId(null);
    setStatusTone("success");
    setStatus("POS session closed.");
  }

  async function handleCreateOrder() {
    const items = cart.length
      ? cart.map((item) => ({ product: item.product, quantity: item.quantity }))
      : [{ product: productId, quantity: Math.max(1, Number(quantity) || 1) }];

    const response = await createPosOrder({ items });
    setStatusTone("success");
    setStatus(`POS order created: ${response.data?._id || ""}`);
    setCart([]);
  }

  async function handleBarcodeLookup(value: string) {
    if (!value || !tenantId) return;
    try {
      const response = await getProductByBarcode(value, tenantId);
      const product = response.data as { _id?: string; name?: string; price?: number } | undefined;
      const resolvedProductId = typeof product?._id === "string" ? product._id : "";
      if (!resolvedProductId) return;
      const resolvedProductName = typeof product?.name === "string" && product.name.trim() ? product.name : "Item";
      const resolvedProductPrice = typeof product?.price === "number" ? product.price : 0;
      setCart((current) => {
        const existing = current.find((item) => item.product === resolvedProductId);
        if (existing) {
          return current.map((item) =>
            item.product === resolvedProductId ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [
          ...current,
          { product: resolvedProductId, name: resolvedProductName, price: resolvedProductPrice, quantity: 1 },
        ];
      });
      triggerScanFeedback();
    } catch (err) {
      setStatusTone("error");
      setStatus(err instanceof Error ? err.message : "Barcode lookup failed");
      showScanError(err instanceof Error ? err.message : "Barcode lookup failed");
    }
  }

  async function handleSkuLookup() {
    if (!sku || !tenantId) return;
    await handleBarcodeLookup(sku);
  }

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape" && scannerOpen) {
        event.preventDefault();
        setScannerOpen(false);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setScannerOpen(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void handleCreateOrder();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setSoundEnabled((current) => !current);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [scannerOpen, cart.length, productId, quantity]);

  useEffect(() => {
    async function startScanner() {
      if (!scannerOpen) return;
      const BarcodeDetectorImpl = window.BarcodeDetector;
      if (!BarcodeDetectorImpl) {
        setStatusTone("error");
        setStatus("Barcode scanning not supported in this browser.");
        showScanError("Barcode scanning not supported in this browser.");
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

        const detector = new BarcodeDetectorImpl({
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
                setStatusTone("success");
                setStatus("Barcode captured.");
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
        setStatusTone("error");
        setStatus(err instanceof Error ? err.message : "Camera access denied");
        showScanError(err instanceof Error ? err.message : "Camera access denied");
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

  function playTone(frequency: number, duration: number, volume: number) {
    if (!soundEnabled) return;
    const normalizedVolume = Math.min(0.2, Math.max(0.02, volume));
    try {
      const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextImpl) return;
      const context = new AudioContextImpl();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.value = normalizedVolume;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
      oscillator.onended = () => {
        context.close().catch(() => null);
      };
    } catch {
      // ignore audio errors
    }
  }

  function triggerScanFeedback() {
    setScanFlash(true);
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => setScanFlash(false), 450);

    playTone(880, 0.08, volumeValue);
    if (navigator.vibrate) {
      navigator.vibrate(35);
    }
  }

  function showScanError(message: string) {
    setToastTitle("Scan error");
    setToastMessage(message);
    setToastOpen(true);
    if (navigator.vibrate) {
      navigator.vibrate([180, 60, 120]);
    }
    playTone(220, 0.18, volumeValue * 1.5);
  }

  return (
    <ToastProvider swipeDirection="right">
      <ToastRegion>
        <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">POS</p>
        <h1 className="dx-display text-3xl">Point of Sale</h1>
        <p className="text-sm text-muted-foreground">Open sessions, take orders, and sync inventory.</p>
      </div>

      <Card>
        <CardTitle>Session control</CardTitle>
        <CardDescription className="mt-2">Open and close a POS session to start tracking sales.</CardDescription>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleOpenSession} disabled={!!sessionId}>
            Open session
          </Button>
          <Button variant="secondary" onClick={handleCloseSession} disabled={!sessionId}>
            Close session
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Active session</span>
          <Badge variant={sessionId ? "success" : "warning"}>{sessionId || "None"}</Badge>
        </div>
      </Card>

      <Card>
        <CardTitle>Scan feedback</CardTitle>
        <CardDescription className="mt-2">Control audio feedback for barcode scans.</CardDescription>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            Sound enabled
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.02"
              max="0.2"
              step="0.01"
              value={volumeValue}
              onChange={(event) => setSoundVolume(event.target.value)}
              className="w-36"
              aria-label="Scan tone volume"
            />
            <span className="text-xs text-muted-foreground">
              {Math.round((volumeValue / 0.2) * 100)}%
            </span>
          </div>
          <TextInput
            type="number"
            value={soundVolume}
            onChange={(event) => setSoundVolume(event.target.value)}
            placeholder="Volume"
            className="w-24"
          />
          <span className="text-xs text-muted-foreground">Range 0.02 - 0.2 (Ctrl/Cmd + M to mute)</span>
        </div>
      </Card>

      <Card>
        <CardTitle>Create POS order</CardTitle>
        <CardDescription className="mt-2">Scan barcodes, add SKUs, and create a POS order.</CardDescription>
        <div className="grid gap-3 md:grid-cols-2">
          <TextInput
            wrapperClassName="md:col-span-2"
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
          <Button
            variant="secondary"
            onClick={() => setScannerOpen(true)}
            className="md:col-span-2"
          >
            Open camera scanner
          </Button>
          <TextInput
            placeholder="Product ID"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          />
          <TextInput
            placeholder="SKU / Barcode manual"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSkuLookup();
              }
            }}
          />
          <TextInput
            placeholder="Quantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleCreateOrder}>Create order</Button>
          <Button variant="secondary" onClick={handleSkuLookup}>Add by SKU</Button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Shortcuts: Ctrl/Cmd + K (scanner), Ctrl/Cmd + Enter (create order), Ctrl/Cmd + M (mute), Esc (close scanner)
        </div>
        {cart.length ? (
          <div className="grid gap-2 text-xs text-muted-foreground">
            {cart.map((item) => (
              <div key={item.product} className="flex items-center justify-between">
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
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
                  </Button>
                  <span>
                    {item.quantity} x {item.price}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
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
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCart((current) => current.filter((entry) => entry.product !== item.product))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {scannerOpen ? (
        <Card>
          <CardTitle>Scanner</CardTitle>
          <CardDescription className="mt-2">Point the camera at the barcode to auto-capture.</CardDescription>
          <div className="relative">
            <video
              ref={videoRef}
              className={`w-full rounded-2xl border border-white/60 ${scanFlash ? "ring-2 ring-emerald-400" : ""}`}
              muted
              playsInline
            />
            <div className={`pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400/70 ${scanFlash ? "opacity-100" : "opacity-0"} transition-opacity`} />
          </div>
          <Button variant="secondary" onClick={() => setScannerOpen(false)}>
            Close scanner
          </Button>
        </Card>
      ) : null}

          {status ? <Alert variant={statusTone}>{status}</Alert> : null}
        </div>
        <Toast open={toastOpen} onOpenChange={setToastOpen}>
          <ToastTitle>{toastTitle}</ToastTitle>
          <ToastDescription>{toastMessage}</ToastDescription>
        </Toast>
      </ToastRegion>
    </ToastProvider>
  );
}
