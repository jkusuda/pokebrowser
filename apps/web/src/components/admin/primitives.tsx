"use client";

import { cn } from "@/lib/utils";

/** Shared control styling so every admin section looks like one tool, not five. */
export const adminInputClass = "!py-1.5 !px-2.5 !rounded-lg !border-2 text-sm";
export const adminSelectClass =
  "px-2.5 py-1.5 rounded-lg border-2 border-black bg-white text-sm font-bold text-pb-ink";

/** Labelled control row. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="font-black tracking-widest uppercase text-[0.5625rem] text-pb-ink/60">
        {label}
        {hint && <span className="ml-1.5 normal-case tracking-normal font-bold opacity-70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Section subheading with a hairline rule. */
export function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-black tracking-widest uppercase text-[0.625rem] text-pb-ink/60 border-b-2 border-black/10 pb-1">
      {children}
    </h3>
  );
}

/** Success/failure line printed under a tool's controls. */
export function StatusLine({ status }: { status: { ok: boolean; message: string } | null }) {
  if (!status) return null;
  return (
    <p
      className={cn(
        "font-bold text-xs",
        status.ok ? "text-pb-primary" : "text-pb-poppy"
      )}
      role="status"
    >
      {status.message}
    </p>
  );
}
