"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";

// Popup's own base width — 1x. Multiply by `sizeFactor` for bigger variants
// (e.g. a multi-slide tutorial with side-by-side screenshots). Capped by a
// viewport-relative bound too, so a large sizeFactor still shrinks to fit
// smaller windows instead of just butting up against the screen edge.
const BASE_WIDTH_REM = 28; // matches Tailwind's max-w-md
const VIEWPORT_WIDTH_CAP = "92vw";

type Props = {
  title: string;
  onClose?: () => void;
  closeOnEscape?: boolean;
  /** Multiplier on the popup's base max-width (28rem / max-w-md). Default 1. */
  sizeFactor?: number;
  children: React.ReactNode;
};

/**
 * Shared chrome for one-off notice/announcement popups: dimmed backdrop,
 * header bar with an embossed title and optional close button, and a padded
 * content area. Used for the tutorial/onboarding slides and simple one-shot
 * notices (e.g. ExtensionDownModal).
 */
export function Popup({ title, onClose, closeOnEscape, sizeFactor = 1, children }: Props) {
  return (
    <ModalShell onClose={onClose} closeOnEscape={closeOnEscape}>
      <Card
        variant="game"
        tone="cream"
        className="relative z-10 w-full mx-4 p-0 gap-0 max-h-[90vh] transition-[height] duration-200"
        style={{ maxWidth: `min(${VIEWPORT_WIDTH_CAP}, ${BASE_WIDTH_REM * sizeFactor}rem)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b-4 border-black bg-pb-accent">
          <h2 className="text-emboss text-xl">{title}</h2>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="font-black text-xl text-black hover:opacity-70 h-auto w-auto p-1"
              aria-label="Close"
            >
              ✕
            </Button>
          )}
        </div>

        <div className="p-6 flex flex-col gap-5 min-h-0 overflow-y-auto custom-scrollbar">{children}</div>
      </Card>
    </ModalShell>
  );
}
