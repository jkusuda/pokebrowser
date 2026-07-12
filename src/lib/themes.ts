import {
  THEMES as SHARED_THEMES,
  isThemeId,
  type ThemeId,
} from "shared-types";

// Profile color themes. Server-safe (no image imports — same rule as
// achievements-data.ts): imported by the /api/trainer/theme route,
// SettingsPage, and profile/page.tsx.
//
// Ids and palettes live in packages/shared-types/src/themes.ts (shared with
// the extension). This module just adapts them for the Settings picker.
// Adding a theme: add it there + a [data-theme="..."] block in globals.css +
// the users_theme_check DB constraint + a background image in
// profile/page.tsx and extension/src/lib/theme.ts.

export type { ThemeId };
export { isThemeId };

// Order = display order in the Settings picker. swatch is each theme's
// pb-primary so the picker shows the theme's real color regardless of which
// theme is active.
export const THEMES: { id: ThemeId; label: string; swatch: string }[] =
  SHARED_THEMES.map(({ id, label, palette }) => ({
    id,
    label,
    swatch: palette.primary,
  }));
