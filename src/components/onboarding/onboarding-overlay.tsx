"use client";

import { motion } from "framer-motion";

interface OnboardingOverlayProps {
  targetRect: DOMRect | null;
  onDismiss: () => void;
}

const SPOTLIGHT_PADDING = 8;

export function OnboardingOverlay({ targetRect, onDismiss }: OnboardingOverlayProps) {
  if (!targetRect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-void-black/60"
        onClick={onDismiss}
        aria-hidden
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100]"
      onClick={onDismiss}
      aria-hidden
    >
      <motion.div
        layout
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute rounded-sm ring-2 ring-primary/70 motion-reduce:animate-none animate-pulse"
        style={{
          top: targetRect.top - SPOTLIGHT_PADDING,
          left: targetRect.left - SPOTLIGHT_PADDING,
          width: targetRect.width + SPOTLIGHT_PADDING * 2,
          height: targetRect.height + SPOTLIGHT_PADDING * 2,
          boxShadow: "0 0 0 9999px rgba(10, 12, 10, 0.6)",
        }}
      />
    </motion.div>
  );
}
