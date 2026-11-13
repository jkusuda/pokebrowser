// Theme ids and palettes shared by the web app and the extension. The web app's
// globals.css repeats these hexes as CSS variables (Tailwind can't read TS), so
// keep its [data-theme] blocks in sync. A new theme also needs the ThemeId union
// (api-client), the Go/DB theme check and a background image in both apps.

import type { ThemeId } from "api-client";

export type { ThemeId };

export const DEFAULT_THEME: ThemeId = "green";

export interface ThemePalette {
  bg: string; // page/card background
  surface: string; // pale panel
  accent: string; // mid accent (buttons, backdrops)
  accentHover: string;
  accentDeep: string; // strong button fill
  primary: string; // strongest brand color (also the picker swatch)
  ink: string; // dark text on theme surfaces
  poppy: string; // red accent (theme-invariant today, themable by design)
  poppyHover: string;
}

export const THEMES: { id: ThemeId; label: string; palette: ThemePalette }[] = [
  {
    id: "green",
    label: "Green",
    palette: {
      bg: "#e0f4d9",
      surface: "#ecf5e8",
      accent: "#9dcd9d",
      accentHover: "#b3d9b3",
      accentDeep: "#8abf8a",
      primary: "#4a8a44",
      ink: "#2d5a27",
      poppy: "#c0392b",
      poppyHover: "#e74c3c",
    },
  },
  {
    id: "blue",
    label: "Blue",
    palette: {
      bg: "#d6e9f5",
      surface: "#e9f1f7",
      accent: "#92bdd9",
      accentHover: "#abcde3",
      accentDeep: "#7eafce",
      primary: "#3672a1",
      ink: "#244460",
      poppy: "#c0392b",
      poppyHover: "#e74c3c",
    },
  },
];

export const THEME_PALETTES: Record<ThemeId, ThemePalette> = Object.fromEntries(
  THEMES.map((t) => [t.id, t.palette])
) as Record<ThemeId, ThemePalette>;

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
