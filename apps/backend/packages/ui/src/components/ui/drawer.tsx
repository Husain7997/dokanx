"use client";

import type { ComponentPropsWithoutRef } from "react";

import { Modal, ModalClose, ModalContent, ModalTrigger } from "./modal";
import { cn } from "../../lib/utils";

export const Drawer = Modal;
export const DrawerTrigger = ModalTrigger;
export const DrawerClose = ModalClose;

export function DrawerContent({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <ModalContent
      className={cn(
        "left-auto right-0 top-0 h-screen w-[min(90vw,28rem)] translate-x-0 translate-y-0 rounded-none rounded-l-[var(--radius-xl)]",
        className
      )}
      {...props}
    />
  );
}
