"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

export function ModalContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "dx-surface fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border p-6 shadow-[var(--shadow-lg)]",
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function ModalHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-6 space-y-1", className)} {...props} />;
}

export function ModalTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Title>) {
  return <Dialog.Title className={cn("text-xl font-semibold", className)} {...props} />;
}

export function ModalDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Description>) {
  return <Dialog.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function ModalFooter({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("mt-6 flex justify-end gap-3", className)}>{children}</div>;
}
