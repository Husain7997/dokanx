"use client";

import { useState } from "react";

import { createPosOrder, openPosSession, closePosSession } from "@/lib/runtime-api";

export default function PosPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [barcode, setBarcode] = useState("");

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
    const qty = Math.max(1, Number(quantity) || 1);
    const response = await createPosOrder({
      items: [{ product: productId, quantity: qty }],
    });
    setStatus(`POS order created: ${response.data?._id || ""}`);
  }

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
                setProductId(value);
              }
            }}
          />
          <input
            className="rounded-xl border border-white/60 bg-white px-3 py-2 text-sm"
            placeholder="Product ID"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
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
      </div>

      {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
    </div>
  );
}
