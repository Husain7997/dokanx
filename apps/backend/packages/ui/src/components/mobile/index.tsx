"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

export type BottomNavItem = {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
};

export function BottomNavigation({
  items,
  className
}: {
  items: BottomNavItem[];
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t bg-card px-4 py-3",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className={cn(
            "flex flex-col items-center gap-1 text-xs",
            item.active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function FloatingActionButton({
  label,
  onClick,
  className
}: {
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="primary"
      onClick={onClick}
      className={cn("rounded-full px-5 py-3 shadow-[var(--shadow-md)]", className)}
    >
      {label}
    </Button>
  );
}

export function SwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className
}: {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}) {
  const startX = useRef<number | null>(null);

  return (
    <div
      className={cn("touch-pan-y rounded-[var(--radius-lg)] bg-card p-4 shadow-[var(--shadow-sm)]", className)}
      onPointerDown={(event) => {
        startX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (startX.current === null) return;
        const delta = event.clientX - startX.current;
        if (delta > 60) onSwipeRight?.();
        if (delta < -60) onSwipeLeft?.();
        startX.current = null;
      }}
    >
      {children}
    </div>
  );
}

export function PullToRefresh({
  children,
  onRefresh,
  className
}: {
  children: ReactNode;
  onRefresh?: () => void;
  className?: string;
}) {
  const startY = useRef<number | null>(null);

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={(event) => {
        startY.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        if (startY.current === null) return;
        const endY = event.changedTouches[0]?.clientY ?? startY.current;
        if (endY - startY.current > 70) onRefresh?.();
        startY.current = null;
      }}
    >
      {children}
    </div>
  );
}
