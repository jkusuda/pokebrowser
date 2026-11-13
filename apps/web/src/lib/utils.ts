import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The message of a caught error, or an empty string for non-Error values. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

export function xpBar({ xp, levelXp, nextLevelXp }: { xp: number; levelXp: number; nextLevelXp: number }) {
  const current = xp - levelXp;
  const required = nextLevelXp - levelXp;
  return { current, required, percent: Math.min(100, (current / required) * 100) };
}
