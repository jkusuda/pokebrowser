/** All type names present in Gen 1 Pokémon (including fairy/steel retroactively). */
export const GEN1_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "steel", "fairy",
] as const;

export type Gen1Type = (typeof GEN1_TYPES)[number];

interface TypeStyle {
  background: string;
  border: string;
  icon: string;
}

const FALLBACK: TypeStyle = {
  background: "#dff0cb",
  border: "#4ecf87",
  icon: "",
};

const ICON_BASE = "https://archives.bulbagarden.net/media/upload";

// Single source of truth for type colors + icon URLs. `dark` is included for
// PokedexOverlay rendering of non-Gen-1 references in shared data files.
const TYPE_STYLES: Record<string, TypeStyle> = {
  normal:   { background: "#A8A878", border: "#8A8A59", icon: `${ICON_BASE}/2/22/GO_Normal.png` },
  fire:     { background: "#F08030", border: "#C06020", icon: `${ICON_BASE}/0/0e/GO_Fire.png` },
  water:    { background: "#6890F0", border: "#4070D0", icon: `${ICON_BASE}/a/aa/GO_Water.png` },
  electric: { background: "#F8D030", border: "#C8A020", icon: `${ICON_BASE}/4/4a/GO_Electric.png` },
  grass:    { background: "#78C850", border: "#58A030", icon: `${ICON_BASE}/6/61/GO_Grass.png` },
  ice:      { background: "#98D8D8", border: "#70B8B8", icon: `${ICON_BASE}/c/c6/GO_Ice.png` },
  fighting: { background: "#C03028", border: "#902018", icon: `${ICON_BASE}/1/1e/GO_Fighting.png` },
  poison:   { background: "#A040A0", border: "#803080", icon: `${ICON_BASE}/f/ff/GO_Poison.png` },
  ground:   { background: "#E0C068", border: "#C0A048", icon: `${ICON_BASE}/2/21/GO_Ground.png` },
  flying:   { background: "#A890F0", border: "#8870D0", icon: `${ICON_BASE}/8/87/GO_Flying.png` },
  psychic:  { background: "#F85888", border: "#C83868", icon: `${ICON_BASE}/f/f2/GO_Psychic.png` },
  bug:      { background: "#A8B820", border: "#889818", icon: `${ICON_BASE}/9/94/GO_Bug.png` },
  rock:     { background: "#B8A038", border: "#988028", icon: `${ICON_BASE}/1/11/GO_Rock.png` },
  ghost:    { background: "#705898", border: "#504078", icon: `${ICON_BASE}/a/a1/GO_Ghost.png` },
  dragon:   { background: "#7038F8", border: "#5020C8", icon: `${ICON_BASE}/9/90/GO_Dragon.png` },
  dark:     { background: "#705848", border: "#504038", icon: `${ICON_BASE}/7/73/GO_Dark.png` },
  steel:    { background: "#B8B8D0", border: "#9898B0", icon: `${ICON_BASE}/d/d2/GO_Steel.png` },
  fairy:    { background: "#EE99AC", border: "#D0708C", icon: `${ICON_BASE}/a/ae/GO_Fairy.png` },
};

export function getTypeColor(typeName: string): Pick<TypeStyle, "background" | "border"> {
  return TYPE_STYLES[typeName.toLowerCase()] ?? FALLBACK;
}

export function getTypeIconPath(typeName: string): string {
  return TYPE_STYLES[typeName.toLowerCase()]?.icon ?? FALLBACK.icon;
}

/** Background-only lookup map; kept for callers that don't need borders. */
export const TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_STYLES).map(([k, v]) => [k, v.background])
);
