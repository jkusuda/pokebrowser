"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Underline-style sub-tab selector used inside game panels (Friends sub-tabs,
 * Global Stats categories). Sits on a container with `border-b-2 border-black/10`;
 * the -mb-[2px] overlaps that border so the active underline replaces it.
 */
export function SubTabButton({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-auto px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-t-lg rounded-b-none border-b-2 -mb-[2px]",
        active
          ? "text-pb-ink border-pb-primary bg-black/5 hover:bg-black/5"
          : "text-pb-ink/50 border-transparent hover:text-pb-ink/80",
        className
      )}
    >
      {children}
    </Button>
  );
}
