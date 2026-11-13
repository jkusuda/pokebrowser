"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { cn } from "@/lib/utils";

type Props = {
  /** Custom refresh action; defaults to a server re-fetch via useRefresh. */
  onRefresh?: () => void;
  /** External pending state for custom refreshes (e.g. a client fetch). */
  refreshing?: boolean;
};

export default function RefreshButton({ onRefresh, refreshing = false }: Props) {
  const { refresh, pending } = useRefresh();
  const busy = pending || refreshing;

  return (
    <Button
      type="button"
      variant="game"
      tone="neutral"
      size="icon"
      className="h-8 w-8 border-2 shadow-[2px_2px_0_black] [&_svg]:size-4"
      disabled={busy}
      aria-label="Refresh"
      onClick={onRefresh ?? refresh}
    >
      <RefreshCw className={cn(busy && "animate-spin")} />
    </Button>
  );
}
