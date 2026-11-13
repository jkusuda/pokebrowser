import { cn } from "@/lib/utils";

/** Pulsing placeholder block for loading states. */
export function Shimmer({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("bg-pb-primary/30 animate-pulse rounded-lg", className)}
      style={style}
    />
  );
}
