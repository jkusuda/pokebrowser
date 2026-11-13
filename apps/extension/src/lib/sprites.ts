const SPRITE_BASE =
  "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated";

const CRY_BASE = "https://cdn.jsdelivr.net/gh/PokeAPI/cries@main/cries/pokemon/latest";

export function getPokemonSprite(pokedexNumber: number, isShiny: boolean): string {
  return isShiny
    ? `${SPRITE_BASE}/shiny/${pokedexNumber}.gif`
    : `${SPRITE_BASE}/${pokedexNumber}.gif`;
}

export function getPokemonCry(pokedexNumber: number): string {
  return `${CRY_BASE}/${pokedexNumber}.ogg`;
}

// Bundled overworld atlases (public/overworld/atlas-N.png, dex 1–386): each 1024×1024 atlas
// holds 8 dex × 2 variants (normal, shiny) as 16 cells of 256×256 in a 4×4 grid. Each cell is
// a 4×4 walk sheet (rows face down/left/right/up). cellX/cellY are in cell units.
// Throws if the extension context is invalidated.
export function getOverworldSheet(
  pokedexNumber: number,
  isShiny: boolean
): { url: string; cellX: number; cellY: number } {
  const atlas = Math.floor((pokedexNumber - 1) / 8);
  const cell = ((pokedexNumber - 1) % 8) * 2 + (isShiny ? 1 : 0);
  return {
    url: chrome.runtime.getURL(`overworld/atlas-${atlas}.png`),
    cellX: cell % 4,
    cellY: Math.floor(cell / 4),
  };
}
