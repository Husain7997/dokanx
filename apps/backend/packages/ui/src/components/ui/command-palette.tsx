"use client";

import type { ReactNode } from "react";

import { Input } from "./input";
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "./modal";

export function CommandPalette({
  open,
  children
}: {
  open?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal open={open}>
      <ModalContent className="z-[var(--z-command)]">
        <ModalHeader>
          <ModalTitle>Command Palette</ModalTitle>
          <ModalDescription>Search actions, pages, and shortcuts.</ModalDescription>
        </ModalHeader>
        <Input placeholder="Type a command or search..." />
        <div className="mt-4">{children}</div>
      </ModalContent>
    </Modal>
  );
}
