/** All type names present in Gen 1 Pokémon (including fairy/steel retroactively). */
export const GEN1_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "steel", "fairy",
] as const;

export type Gen1Type = typeof GEN1_TYPES[number];

export function getTypeIconPath(typeName: string): string {
  const iconMap: Record<string, string> = {
    normal: 'https://archives.bulbagarden.net/media/upload/2/22/GO_Normal.png',
    fire: 'https://archives.bulbagarden.net/media/upload/0/0e/GO_Fire.png',
    water: 'https://archives.bulbagarden.net/media/upload/a/aa/GO_Water.png',
    electric: 'https://archives.bulbagarden.net/media/upload/4/4a/GO_Electric.png',
    grass: 'https://archives.bulbagarden.net/media/upload/6/61/GO_Grass.png',
    ice: 'https://archives.bulbagarden.net/media/upload/c/c6/GO_Ice.png',
    fighting: 'https://archives.bulbagarden.net/media/upload/1/1e/GO_Fighting.png',
    poison: 'https://archives.bulbagarden.net/media/upload/f/ff/GO_Poison.png',
    ground: 'https://archives.bulbagarden.net/media/upload/2/21/GO_Ground.png',
    flying: 'https://archives.bulbagarden.net/media/upload/8/87/GO_Flying.png',
    psychic: 'https://archives.bulbagarden.net/media/upload/f/f2/GO_Psychic.png',
    bug: 'https://archives.bulbagarden.net/media/upload/9/94/GO_Bug.png',
    rock: 'https://archives.bulbagarden.net/media/upload/1/11/GO_Rock.png',
    ghost: 'https://archives.bulbagarden.net/media/upload/a/a1/GO_Ghost.png',
    dragon: 'https://archives.bulbagarden.net/media/upload/9/90/GO_Dragon.png',
    dark: 'https://archives.bulbagarden.net/media/upload/7/73/GO_Dark.png',
    steel: 'https://archives.bulbagarden.net/media/upload/d/d2/GO_Steel.png',
    fairy: 'https://archives.bulbagarden.net/media/upload/a/ae/GO_Fairy.png'
  };
  return iconMap[typeName.toLowerCase()] || '';
}

export const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878", fire: "#F08030", water: "#6890F0",
  electric: "#F8D030", grass: "#78C850", ice: "#98D8D8",
  fighting: "#C03028", poison: "#A040A0", ground: "#E0C068",
  flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
  rock: "#B8A038", ghost: "#705898", dragon: "#7038F8",
  dark: "#705848", steel: "#B8B8D0", fairy: "#EE99AC"
};

export function getTypeColor(typeName: string): { background: string; border: string } {
  const colors: Record<string, { background: string; border: string }> = {
    normal: { background: '#A8A878', border: '#8A8A59' },
    fire: { background: '#F08030', border: '#C06020' },
    water: { background: '#6890F0', border: '#4070D0' },
    electric: { background: '#F8D030', border: '#C8A020' },
    grass: { background: '#78C850', border: '#58A030' },
    ice: { background: '#98D8D8', border: '#70B8B8' },
    fighting: { background: '#C03028', border: '#902018' },
    poison: { background: '#A040A0', border: '#803080' },
    ground: { background: '#E0C068', border: '#C0A048' },
    flying: { background: '#A890F0', border: '#8870D0' },
    psychic: { background: '#F85888', border: '#C83868' },
    bug: { background: '#A8B820', border: '#889818' },
    rock: { background: '#B8A038', border: '#988028' },
    ghost: { background: '#705898', border: '#504078' },
    dragon: { background: '#7038F8', border: '#5020C8' },
    dark: { background: '#705848', border: '#504038' },
    steel: { background: '#B8B8D0', border: '#9898B0' },
    fairy: { background: '#EE99AC', border: '#D0708C' }
  };
  return colors[typeName.toLowerCase()] || { background: '#dff0cb', border: '#4ecf87' };
}
