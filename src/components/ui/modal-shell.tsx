"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /**
   * Called when the backdrop is clicked (and on Escape if `closeOnEscape`).
   * Omit to render a blocking modal that can't be dismissed from the shell.
   */
  onClose?: () => void;
  closeOnEscape?: boolean;
  /** Extra classes on the full-screen container (e.g. a z-index override). */
  className?: string;
  /** Extra classes on the dimmed backdrop layer (e.g. a darker tint). */
  backdropClassName?: string;
  children: React.ReactNode;
};

/**
 * Full-screen overlay + dimmed backdrop shared by every modal. Clicks on the
 * backdrop bubble to the container and close the modal, so the panel passed
 * as children must call `e.stopPropagation()` on its own clicks.
 */
export function ModalShell({
  onClose,
  closeOnEscape = false,
  className,
  backdropClassName,
  children,
}: Props) {
  useEffect(() => {
    if (!onClose || !closeOnEscape) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose!();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closeOnEscape]);

  return (
    <div
      className={cn("fixed inset-0 z-300 flex items-center justify-center", className)}
      onClick={onClose}
    >
      <div className={cn("absolute inset-0 bg-black/50 backdrop-blur-sm", backdropClassName)} />
      {children}
    </div>
  );
}
