// The user's theme restyles the popup and the encounter overlay. Palettes come from the
// shared "themes" package; a new theme only needs a background entry below.

import {
  DEFAULT_THEME,
  THEME_PALETTES,
  isThemeId,
  type ThemeId,
} from "themes";

export { DEFAULT_THEME, type ThemeId };

/** Narrow an untrusted/unknown value (API value, cached storage) to a ThemeId. */
export function resolveTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

// Palette slot → CSS custom property used by App.tsx and getPopupCSS.
const VAR_NAMES = {
  bg: "--pb-bg",
  surface: "--pb-surface",
  accent: "--pb-accent",
  accentHover: "--pb-accent-hover",
  accentDeep: "--pb-accent-deep",
  primary: "--pb-primary",
  ink: "--pb-ink",
  poppy: "--pb-poppy",
  poppyHover: "--pb-poppy-hover",
} as const;

/** Custom-property map for a React `style` prop on a subtree root. */
export function themeVars(theme: ThemeId): Record<string, string> {
  const palette = THEME_PALETTES[theme];
  return Object.fromEntries(
    (Object.keys(VAR_NAMES) as (keyof typeof VAR_NAMES)[]).map((slot) => [
      VAR_NAMES[slot],
      palette[slot],
    ])
  );
}

/** The same map as CSS declarations, for injecting into a `:host` block. */
export function themeVarsCSS(theme: ThemeId): string {
  return Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n      ");
}

export const THEME_BACKGROUNDS: Record<ThemeId, string> = {
  green: "./route101.webp",
  blue: "./theme_background_2.webp",
};
