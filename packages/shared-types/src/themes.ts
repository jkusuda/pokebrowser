// Profile color themes — single source of truth for the theme ids and their
// color palettes, shared by the web app and the extension.
//
// The web app's globals.css hand-writes the same hexes as CSS custom
// properties (the @theme block for green, a [data-theme="..."] block per
// other theme) because Tailwind can't consume TS at build time — keep those
// blocks in sync with THEMES here. The extension consumes THEMES directly
// (extension/src/lib/theme.ts) and needs no per-theme CSS.
//
// Adding a theme: add an entry here + the User["theme"] union updates
// automatically (it's ThemeId) + a [data-theme] block in src/app/globals.css
// + the users_theme_check DB constraint + a background image in
// src/app/profile/page.tsx and extension/src/lib/theme.ts.

export type ThemeId = "green" | "blue";

export const DEFAULT_THEME: ThemeId = "green";

// The pb-* palette slots each theme must fill. `inactive*` and the shadcn
// HSL tokens only exist web-side (grayed pills, ghost hovers) and stay in
// globals.css; this is the subset both apps render.
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
