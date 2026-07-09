import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Narrow caught errors to a message string without leaking `any` everywhere. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}
