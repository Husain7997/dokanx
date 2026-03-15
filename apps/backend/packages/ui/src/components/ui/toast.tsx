"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../../lib/utils";

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = ToastPrimitive.Viewport;

export function Toast({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "dx-surface grid gap-1 rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-md)]",
        className
      )}
      {...props}
    />
  );
}

export function ToastTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn("text-sm font-semibold", className)} {...props} />;
}

export function ToastDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function ToastRegion({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ToastViewport className="fixed bottom-4 right-4 z-[100] grid w-96 max-w-[calc(100vw-2rem)] gap-2" />
    </>
  );
}
