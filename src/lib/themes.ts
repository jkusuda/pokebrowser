import type { User } from "@/types";

// Profile color themes. Server-safe (no image imports — same rule as
// achievements-data.ts): imported by the /api/trainer/theme route,
// SettingsPage, and profile/page.tsx. Adding a theme: add an entry here + a
// [data-theme="..."] block in globals.css + the User["theme"] union in
// shared-types + the users_theme_check DB constraint + a background image in
// profile/page.tsx — keep all five in sync.

export type ThemeId = User["theme"];

// Order = display order in the Settings picker. swatch is a literal hex (each
// theme's pb-primary) so the picker shows the theme's real color regardless of
// which theme is active.
export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "green", label: "Green", swatch: "#4a8a44" },
  { id: "blue", label: "Blue", swatch: "#3672a1" },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
