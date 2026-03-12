"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: "easeOut" }
};

export function PageTransition({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} {...fadeUp}>
      {children}
    </motion.div>
  );
}

export function HoverLift({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
