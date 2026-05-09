"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GripHorizontal, ShoppingCart, X } from "lucide-react";
import { Button } from "@dokanx/ui";

import { useCartStore } from "@/stores/cart-store";

export function FloatingCartButton() {
  const cart = useCartStore((state) => state.cart);
  const [position, setPosition] = useState({ x: 18, y: 92 });
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  const totals = useMemo(() => {
    return Object.values(cart).reduce(
      (sum, shopCart) => ({
        items: sum.items + shopCart.items.reduce((lineSum, line) => lineSum + line.quantity, 0),
        subtotal: sum.subtotal + shopCart.subtotal,
      }),
      { items: 0, subtotal: 0 },
    );
  }, [cart]);

  useEffect(() => {
    if (totals.items) setHidden(false);
  }, [totals.items]);

  if (!totals.items || hidden) return null;

  return (
    <div
      className="fixed z-50 w-[min(92vw,340px)] rounded-2xl border border-border bg-card p-3 shadow-2xl"
      style={{ right: position.x, bottom: position.y }}
      onPointerMove={(event) => {
        if (!dragging) return;
        setPosition({
          x: Math.max(12, window.innerWidth - event.clientX - 160),
          y: Math.max(12, window.innerHeight - event.clientY - 30),
        });
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex cursor-grab items-center gap-2 text-left text-sm font-semibold text-foreground active:cursor-grabbing"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          aria-label="Drag cart"
        >
          <GripHorizontal size={18} />
          <ShoppingCart size={18} />
          Cart visible
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border"
          onClick={() => setHidden(true)}
          aria-label="Hide floating cart"
        >
          <X size={15} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span>{totals.items} items</span>
        <span className="font-semibold">{totals.subtotal} BDT</span>
      </div>
      <Button asChild className="mt-3 w-full">
        <Link href="/cart">Open cart</Link>
      </Button>
    </div>
  );
}
