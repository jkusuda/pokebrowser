"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="game"
      tone="neutral"
      size="icon"
      className="h-8 w-8 border-2 shadow-[2px_2px_0_black] [&_svg]:size-4"
      disabled={pending}
      aria-label="Refresh"
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw className={cn(pending && "animate-spin")} />
    </Button>
  );
}
