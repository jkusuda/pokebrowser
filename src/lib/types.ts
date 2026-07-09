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

// Self-hosted GO-style type icons (public/type-icons/<type>.png) — the
// previous bulbagarden hotlinks failed intermittently.
const ICON_BASE = "/type-icons";

// Single source of truth for type colors + icon URLs. `dark` is included for
// PokedexOverlay rendering of non-Gen-1 references in shared data files.
const TYPE_STYLES: Record<string, TypeStyle> = {
  normal:   { background: "#A8A878", border: "#8A8A59", icon: `${ICON_BASE}/normal.png` },
  fire:     { background: "#F08030", border: "#C06020", icon: `${ICON_BASE}/fire.png` },
  water:    { background: "#6890F0", border: "#4070D0", icon: `${ICON_BASE}/water.png` },
  electric: { background: "#F8D030", border: "#C8A020", icon: `${ICON_BASE}/electric.png` },
  grass:    { background: "#78C850", border: "#58A030", icon: `${ICON_BASE}/grass.png` },
  ice:      { background: "#98D8D8", border: "#70B8B8", icon: `${ICON_BASE}/ice.png` },
  fighting: { background: "#C03028", border: "#902018", icon: `${ICON_BASE}/fighting.png` },
  poison:   { background: "#A040A0", border: "#803080", icon: `${ICON_BASE}/poison.png` },
  ground:   { background: "#E0C068", border: "#C0A048", icon: `${ICON_BASE}/ground.png` },
  flying:   { background: "#A890F0", border: "#8870D0", icon: `${ICON_BASE}/flying.png` },
  psychic:  { background: "#F85888", border: "#C83868", icon: `${ICON_BASE}/psychic.png` },
  bug:      { background: "#A8B820", border: "#889818", icon: `${ICON_BASE}/bug.png` },
  rock:     { background: "#B8A038", border: "#988028", icon: `${ICON_BASE}/rock.png` },
  ghost:    { background: "#705898", border: "#504078", icon: `${ICON_BASE}/ghost.png` },
  dragon:   { background: "#7038F8", border: "#5020C8", icon: `${ICON_BASE}/dragon.png` },
  dark:     { background: "#705848", border: "#504038", icon: `${ICON_BASE}/dark.png` },
  steel:    { background: "#B8B8D0", border: "#9898B0", icon: `${ICON_BASE}/steel.png` },
  fairy:    { background: "#EE99AC", border: "#D0708C", icon: `${ICON_BASE}/fairy.png` },
};

export function getTypeColor(typeName: string): Pick<TypeStyle, "background" | "border"> {
  return TYPE_STYLES[typeName.toLowerCase()] ?? FALLBACK;
}

export function getTypeIconPath(typeName: string): string {
  return TYPE_STYLES[typeName.toLowerCase()]?.icon ?? FALLBACK.icon;
}
