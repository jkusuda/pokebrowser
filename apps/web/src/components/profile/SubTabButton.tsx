"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Underline-style sub-tab selector used inside game panels (Friends sub-tabs,
 * Global Stats categories). Sits on a container with `border-b-2 border-black/10`;
 * the -mb-[0.125rem] overlaps that border so the active underline replaces it.
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
        "h-auto px-3 py-1.5 text-[0.5625rem] font-black tracking-widest uppercase rounded-t-lg rounded-b-none border-b-2 -mb-[0.125rem]",
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
