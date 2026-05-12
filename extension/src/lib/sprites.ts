const SPRITE_BASE =
  "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated";

export function getPokemonSprite(pokedexNumber: number, isShiny: boolean): string {
  return isShiny
    ? `${SPRITE_BASE}/shiny/${pokedexNumber}.gif`
    : `${SPRITE_BASE}/${pokedexNumber}.gif`;
}
