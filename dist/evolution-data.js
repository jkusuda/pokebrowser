const EVOLUTION_DATA = {
  // Bulbasaur evolution line
  1: { evolvesTo: 2, candyCost: 25, name: "Ivysaur", baseCandyId: 1 },
  // Bulbasaur → Ivysaur
  2: { evolvesTo: 3, candyCost: 100, name: "Venusaur", baseCandyId: 1 },
  // Ivysaur → Venusaur
  // Charmander evolution line
  4: { evolvesTo: 5, candyCost: 25, name: "Charmeleon", baseCandyId: 4 },
  // Charmander → Charmeleon
  5: { evolvesTo: 6, candyCost: 100, name: "Charizard", baseCandyId: 4 },
  // Charmeleon → Charizard
  // Squirtle evolution line
  7: { evolvesTo: 8, candyCost: 25, name: "Wartortle", baseCandyId: 7 },
  // Squirtle → Wartortle
  8: { evolvesTo: 9, candyCost: 100, name: "Blastoise", baseCandyId: 7 },
  // Wartortle → Blastoise
  // Caterpie evolution line
  10: { evolvesTo: 11, candyCost: 12, name: "Metapod", baseCandyId: 10 },
  // Caterpie → Metapod
  11: { evolvesTo: 12, candyCost: 50, name: "Butterfree", baseCandyId: 10 },
  // Metapod → Butterfree
  // Weedle evolution line
  13: { evolvesTo: 14, candyCost: 12, name: "Kakuna", baseCandyId: 13 },
  // Weedle → Kakuna
  14: { evolvesTo: 15, candyCost: 50, name: "Beedrill", baseCandyId: 13 },
  // Kakuna → Beedrill
  // Pidgey evolution line
  16: { evolvesTo: 17, candyCost: 12, name: "Pidgeotto", baseCandyId: 16 },
  // Pidgey → Pidgeotto
  17: { evolvesTo: 18, candyCost: 50, name: "Pidgeot", baseCandyId: 16 },
  // Pidgeotto → Pidgeot
  // Rattata evolution line
  19: { evolvesTo: 20, candyCost: 25, name: "Raticate", baseCandyId: 19 },
  // Rattata → Raticate
  // Spearow evolution line
  21: { evolvesTo: 22, candyCost: 50, name: "Fearow", baseCandyId: 21 },
  // Spearow → Fearow
  // Ekans evolution line
  23: { evolvesTo: 24, candyCost: 50, name: "Arbok", baseCandyId: 23 },
  // Ekans → Arbok
  // Pikachu evolution line
  25: { evolvesTo: 26, candyCost: 50, name: "Raichu", baseCandyId: 25 },
  // Pikachu → Raichu
  // Sandshrew evolution line
  27: { evolvesTo: 28, candyCost: 50, name: "Sandslash", baseCandyId: 27 },
  // Sandshrew → Sandslash
  // Nidoran♀ evolution line
  29: { evolvesTo: 30, candyCost: 25, name: "Nidorina", baseCandyId: 29 },
  // Nidoran♀ → Nidorina
  30: { evolvesTo: 31, candyCost: 100, name: "Nidoqueen", baseCandyId: 29 },
  // Nidorina → Nidoqueen
  // Nidoran♂ evolution line
  32: { evolvesTo: 33, candyCost: 25, name: "Nidorino", baseCandyId: 32 },
  // Nidoran♂ → Nidorino
  33: { evolvesTo: 34, candyCost: 100, name: "Nidoking", baseCandyId: 32 },
  // Nidorino → Nidoking
  // Clefairy evolution line
  35: { evolvesTo: 36, candyCost: 50, name: "Clefable", baseCandyId: 35 },
  // Clefairy → Clefable
  // Vulpix evolution line
  37: { evolvesTo: 38, candyCost: 50, name: "Ninetales", baseCandyId: 37 },
  // Vulpix → Ninetales
  // Jigglypuff evolution line
  39: { evolvesTo: 40, candyCost: 50, name: "Wigglytuff", baseCandyId: 39 },
  // Jigglypuff → Wigglytuff
  // Zubat evolution line
  41: { evolvesTo: 42, candyCost: 25, name: "Golbat", baseCandyId: 41 },
  // Zubat → Golbat
  // Oddish evolution line
  43: { evolvesTo: 44, candyCost: 25, name: "Gloom", baseCandyId: 43 },
  // Oddish → Gloom
  44: { evolvesTo: 45, candyCost: 100, name: "Vileplume", baseCandyId: 43 },
  // Gloom → Vileplume
  // Paras evolution line
  46: { evolvesTo: 47, candyCost: 50, name: "Parasect", baseCandyId: 46 },
  // Paras → Parasect
  // Venonat evolution line
  48: { evolvesTo: 49, candyCost: 50, name: "Venomoth", baseCandyId: 48 },
  // Venonat → Venomoth
  // Diglett evolution line
  50: { evolvesTo: 51, candyCost: 50, name: "Dugtrio", baseCandyId: 50 },
  // Diglett → Dugtrio
  // Meowth evolution line
  52: { evolvesTo: 53, candyCost: 50, name: "Persian", baseCandyId: 52 },
  // Meowth → Persian
  // Psyduck evolution line
  54: { evolvesTo: 55, candyCost: 50, name: "Golduck", baseCandyId: 54 },
  // Psyduck → Golduck
  // Mankey evolution line
  56: { evolvesTo: 57, candyCost: 50, name: "Primeape", baseCandyId: 56 },
  // Mankey → Primeape
  // Growlithe evolution line
  58: { evolvesTo: 59, candyCost: 50, name: "Arcanine", baseCandyId: 58 },
  // Growlithe → Arcanine
  // Poliwag evolution line
  60: { evolvesTo: 61, candyCost: 25, name: "Poliwhirl", baseCandyId: 60 },
  // Poliwag → Poliwhirl
  61: { evolvesTo: 62, candyCost: 100, name: "Poliwrath", baseCandyId: 60 },
  // Poliwhirl → Poliwrath
  // Abra evolution line
  63: { evolvesTo: 64, candyCost: 25, name: "Kadabra", baseCandyId: 63 },
  // Abra → Kadabra
  64: { evolvesTo: 65, candyCost: 100, name: "Alakazam", baseCandyId: 63 },
  // Kadabra → Alakazam
  // Machop evolution line
  66: { evolvesTo: 67, candyCost: 25, name: "Machoke", baseCandyId: 66 },
  // Machop → Machoke
  67: { evolvesTo: 68, candyCost: 100, name: "Machamp", baseCandyId: 66 },
  // Machoke → Machamp
  // Bellsprout evolution line
  69: { evolvesTo: 70, candyCost: 25, name: "Weepinbell", baseCandyId: 69 },
  // Bellsprout → Weepinbell
  70: { evolvesTo: 71, candyCost: 100, name: "Victreebel", baseCandyId: 69 },
  // Weepinbell → Victreebel
  // Tentacool evolution line
  72: { evolvesTo: 73, candyCost: 50, name: "Tentacruel", baseCandyId: 72 },
  // Tentacool → Tentacruel
  // Geodude evolution line
  74: { evolvesTo: 75, candyCost: 25, name: "Graveler", baseCandyId: 74 },
  // Geodude → Graveler
  75: { evolvesTo: 76, candyCost: 100, name: "Golem", baseCandyId: 74 },
  // Graveler → Golem
  // Ponyta evolution line
  77: { evolvesTo: 78, candyCost: 50, name: "Rapidash", baseCandyId: 77 },
  // Ponyta → Rapidash
  // Slowpoke evolution line
  79: { evolvesTo: 80, candyCost: 50, name: "Slowbro", baseCandyId: 79 },
  // Slowpoke → Slowbro
  // Magnemite evolution line
  81: { evolvesTo: 82, candyCost: 50, name: "Magneton", baseCandyId: 81 },
  // Magnemite → Magneton
  // Doduo evolution line
  84: { evolvesTo: 85, candyCost: 50, name: "Dodrio", baseCandyId: 84 },
  // Doduo → Dodrio
  // Seel evolution line
  86: { evolvesTo: 87, candyCost: 50, name: "Dewgong", baseCandyId: 86 },
  // Seel → Dewgong
  // Grimer evolution line
  88: { evolvesTo: 89, candyCost: 50, name: "Muk", baseCandyId: 88 },
  // Grimer → Muk
  // Shellder evolution line
  90: { evolvesTo: 91, candyCost: 50, name: "Cloyster", baseCandyId: 90 },
  // Shellder → Cloyster
  // Gastly evolution line
  92: { evolvesTo: 93, candyCost: 25, name: "Haunter", baseCandyId: 92 },
  // Gastly → Haunter
  93: { evolvesTo: 94, candyCost: 100, name: "Gengar", baseCandyId: 92 },
  // Haunter → Gengar
  // Drowzee evolution line
  96: { evolvesTo: 97, candyCost: 50, name: "Hypno", baseCandyId: 96 },
  // Drowzee → Hypno
  // Krabby evolution line
  98: { evolvesTo: 99, candyCost: 50, name: "Kingler", baseCandyId: 98 },
  // Krabby → Kingler
  // Voltorb evolution line
  100: { evolvesTo: 101, candyCost: 50, name: "Electrode", baseCandyId: 100 },
  // Voltorb → Electrode
  // Exeggcute evolution line
  102: { evolvesTo: 103, candyCost: 50, name: "Exeggutor", baseCandyId: 102 },
  // Exeggcute → Exeggutor
  // Cubone evolution line
  104: { evolvesTo: 105, candyCost: 50, name: "Marowak", baseCandyId: 104 },
  // Cubone → Marowak
  // Koffing evolution line
  109: { evolvesTo: 110, candyCost: 50, name: "Weezing", baseCandyId: 109 },
  // Koffing → Weezing
  // Rhyhorn evolution line
  111: { evolvesTo: 112, candyCost: 50, name: "Rhydon", baseCandyId: 111 },
  // Rhyhorn → Rhydon
  // Horsea evolution line
  116: { evolvesTo: 117, candyCost: 50, name: "Seadra", baseCandyId: 116 },
  // Horsea → Seadra
  // Goldeen evolution line
  118: { evolvesTo: 119, candyCost: 50, name: "Seaking", baseCandyId: 118 },
  // Goldeen → Seaking
  // Staryu evolution line
  120: { evolvesTo: 121, candyCost: 50, name: "Starmie", baseCandyId: 120 },
  // Staryu → Starmie
  // Magikarp evolution line
  129: { evolvesTo: 130, candyCost: 400, name: "Gyarados", baseCandyId: 129 },
  // Magikarp → Gyarados
  // Eevee evolution lines (special branching evolution - will be handled separately)
  133: {
    evolutions: [
      { evolvesTo: 134, candyCost: 25, name: "Vaporeon", baseCandyId: 133 },
      { evolvesTo: 135, candyCost: 25, name: "Jolteon", baseCandyId: 133 },
      { evolvesTo: 136, candyCost: 25, name: "Flareon", baseCandyId: 133 }
    ]
  },
  // Eevee → Multiple evolutions
  // Omanyte evolution line
  138: { evolvesTo: 139, candyCost: 50, name: "Omastar", baseCandyId: 138 },
  // Omanyte → Omastar
  // Kabuto evolution line
  140: { evolvesTo: 141, candyCost: 50, name: "Kabutops", baseCandyId: 140 },
  // Kabuto → Kabutops
  // Dratini evolution line
  147: { evolvesTo: 148, candyCost: 25, name: "Dragonair", baseCandyId: 147 },
  // Dratini → Dragonair
  148: { evolvesTo: 149, candyCost: 100, name: "Dragonite", baseCandyId: 147 }
  // Dragonair → Dragonite
  // Final evolutions and non-evolving Pokemon have no entries = cannot evolve
};
const CANDY_FAMILY_MAP = {
  // Bulbasaur family - all use Bulbasaur candy (ID 1)
  1: 1,
  2: 1,
  3: 1,
  // Charmander family - all use Charmander candy (ID 4)
  4: 4,
  5: 4,
  6: 4,
  // Squirtle family - all use Squirtle candy (ID 7)
  7: 7,
  8: 7,
  9: 7,
  // Caterpie family - all use Caterpie candy (ID 10)
  10: 10,
  11: 10,
  12: 10,
  // Weedle family - all use Weedle candy (ID 13)
  13: 13,
  14: 13,
  15: 13,
  // Pidgey family - all use Pidgey candy (ID 16)
  16: 16,
  17: 16,
  18: 16,
  // Rattata family - all use Rattata candy (ID 19)
  19: 19,
  20: 19,
  // Spearow family - all use Spearow candy (ID 21)
  21: 21,
  22: 21,
  // Ekans family - all use Ekans candy (ID 23)
  23: 23,
  24: 23,
  // Pikachu family - all use Pikachu candy (ID 25)
  25: 25,
  26: 25,
  // Sandshrew family - all use Sandshrew candy (ID 27)
  27: 27,
  28: 27,
  // Nidoran♀ family - all use Nidoran♀ candy (ID 29)
  29: 29,
  30: 29,
  31: 29,
  // Nidoran♂ family - all use Nidoran♂ candy (ID 32)
  32: 32,
  33: 32,
  34: 32,
  // Clefairy family - all use Clefairy candy (ID 35)
  35: 35,
  36: 35,
  // Vulpix family - all use Vulpix candy (ID 37)
  37: 37,
  38: 37,
  // Jigglypuff family - all use Jigglypuff candy (ID 39)
  39: 39,
  40: 39,
  // Zubat family - all use Zubat candy (ID 41)
  41: 41,
  42: 41,
  // Oddish family - all use Oddish candy (ID 43)
  43: 43,
  44: 43,
  45: 43,
  // Paras family - all use Paras candy (ID 46)
  46: 46,
  47: 46,
  // Venonat family - all use Venonat candy (ID 48)
  48: 48,
  49: 48,
  // Diglett family - all use Diglett candy (ID 50)
  50: 50,
  51: 50,
  // Meowth family - all use Meowth candy (ID 52)
  52: 52,
  53: 52,
  // Psyduck family - all use Psyduck candy (ID 54)
  54: 54,
  55: 54,
  // Mankey family - all use Mankey candy (ID 56)
  56: 56,
  57: 56,
  // Growlithe family - all use Growlithe candy (ID 58)
  58: 58,
  59: 58,
  // Poliwag family - all use Poliwag candy (ID 60)
  60: 60,
  61: 60,
  62: 60,
  // Abra family - all use Abra candy (ID 63)
  63: 63,
  64: 63,
  65: 63,
  // Machop family - all use Machop candy (ID 66)
  66: 66,
  67: 66,
  68: 66,
  // Bellsprout family - all use Bellsprout candy (ID 69)
  69: 69,
  70: 69,
  71: 69,
  // Tentacool family - all use Tentacool candy (ID 72)
  72: 72,
  73: 72,
  // Geodude family - all use Geodude candy (ID 74)
  74: 74,
  75: 74,
  76: 74,
  // Ponyta family - all use Ponyta candy (ID 77)
  77: 77,
  78: 77,
  // Slowpoke family - all use Slowpoke candy (ID 79)
  79: 79,
  80: 79,
  // Magnemite family - all use Magnemite candy (ID 81)
  81: 81,
  82: 81,
  // Doduo family - all use Doduo candy (ID 84)
  84: 84,
  85: 84,
  // Seel family - all use Seel candy (ID 86)
  86: 86,
  87: 86,
  // Grimer family - all use Grimer candy (ID 88)
  88: 88,
  89: 88,
  // Shellder family - all use Shellder candy (ID 90)
  90: 90,
  91: 90,
  // Gastly family - all use Gastly candy (ID 92)
  92: 92,
  93: 92,
  94: 92,
  // Drowzee family - all use Drowzee candy (ID 96)
  96: 96,
  97: 96,
  // Krabby family - all use Krabby candy (ID 98)
  98: 98,
  99: 98,
  // Voltorb family - all use Voltorb candy (ID 100)
  100: 100,
  101: 100,
  // Exeggcute family - all use Exeggcute candy (ID 102)
  102: 102,
  103: 102,
  // Cubone family - all use Cubone candy (ID 104)
  104: 104,
  105: 104,
  // Koffing family - all use Koffing candy (ID 109)
  109: 109,
  110: 109,
  // Rhyhorn family - all use Rhyhorn candy (ID 111)
  111: 111,
  112: 111,
  // Horsea family - all use Horsea candy (ID 116)
  116: 116,
  117: 116,
  // Goldeen family - all use Goldeen candy (ID 118)
  118: 118,
  119: 118,
  // Staryu family - all use Staryu candy (ID 120)
  120: 120,
  121: 120,
  // Magikarp family - all use Magikarp candy (ID 129)
  129: 129,
  130: 129,
  // Eevee family - all use Eevee candy (ID 133)
  133: 133,
  134: 133,
  135: 133,
  136: 133,
  // Omanyte family - all use Omanyte candy (ID 138)
  138: 138,
  139: 138,
  // Kabuto family - all use Kabuto candy (ID 140)
  140: 140,
  141: 140,
  // Dratini family - all use Dratini candy (ID 147)
  147: 147,
  148: 147,
  149: 147,
  // Non-evolving Pokemon use their own candy
  83: 83,
  // Farfetch'd
  95: 95,
  // Onix
  106: 106,
  // Hitmonlee
  107: 107,
  // Hitmonchan
  108: 108,
  // Lickitung
  113: 113,
  // Chansey
  114: 114,
  // Tangela
  115: 115,
  // Kangaskhan
  122: 122,
  // Mr. Mime
  123: 123,
  // Scyther
  124: 124,
  // Jynx
  125: 125,
  // Electabuzz
  126: 126,
  // Magmar
  127: 127,
  // Pinsir
  128: 128,
  // Tauros
  131: 131,
  // Lapras
  132: 132,
  // Ditto
  137: 137,
  // Porygon
  142: 142,
  // Aerodactyl
  143: 143,
  // Snorlax
  144: 144,
  // Articuno
  145: 145,
  // Zapdos
  146: 146,
  // Moltres
  150: 150,
  // Mewtwo
  151: 151
  // Mew
};
const POKEMON_NAMES = {
  1: "Bulbasaur",
  2: "Ivysaur",
  3: "Venusaur",
  4: "Charmander",
  5: "Charmeleon",
  6: "Charizard",
  7: "Squirtle",
  8: "Wartortle",
  9: "Blastoise",
  10: "Caterpie",
  11: "Metapod",
  12: "Butterfree",
  13: "Weedle",
  14: "Kakuna",
  15: "Beedrill",
  16: "Pidgey",
  17: "Pidgeotto",
  18: "Pidgeot",
  19: "Rattata",
  20: "Raticate",
  21: "Spearow",
  22: "Fearow",
  23: "Ekans",
  24: "Arbok",
  25: "Pikachu",
  26: "Raichu",
  27: "Sandshrew",
  28: "Sandslash",
  29: "Nidoran♀",
  30: "Nidorina",
  31: "Nidoqueen",
  32: "Nidoran♂",
  33: "Nidorino",
  34: "Nidoking",
  35: "Clefairy",
  36: "Clefable",
  37: "Vulpix",
  38: "Ninetales",
  39: "Jigglypuff",
  40: "Wigglytuff",
  41: "Zubat",
  42: "Golbat",
  43: "Oddish",
  44: "Gloom",
  45: "Vileplume",
  46: "Paras",
  47: "Parasect",
  48: "Venonat",
  49: "Venomoth",
  50: "Diglett",
  51: "Dugtrio",
  52: "Meowth",
  53: "Persian",
  54: "Psyduck",
  55: "Golduck",
  56: "Mankey",
  57: "Primeape",
  58: "Growlithe",
  59: "Arcanine",
  60: "Poliwag",
  61: "Poliwhirl",
  62: "Poliwrath",
  63: "Abra",
  64: "Kadabra",
  65: "Alakazam",
  66: "Machop",
  67: "Machoke",
  68: "Machamp",
  69: "Bellsprout",
  70: "Weepinbell",
  71: "Victreebel",
  72: "Tentacool",
  73: "Tentacruel",
  74: "Geodude",
  75: "Graveler",
  76: "Golem",
  77: "Ponyta",
  78: "Rapidash",
  79: "Slowpoke",
  80: "Slowbro",
  81: "Magnemite",
  82: "Magneton",
  83: "Farfetch'd",
  84: "Doduo",
  85: "Dodrio",
  86: "Seel",
  87: "Dewgong",
  88: "Grimer",
  89: "Muk",
  90: "Shellder",
  91: "Cloyster",
  92: "Gastly",
  93: "Haunter",
  94: "Gengar",
  95: "Onix",
  96: "Drowzee",
  97: "Hypno",
  98: "Krabby",
  99: "Kingler",
  100: "Voltorb",
  101: "Electrode",
  102: "Exeggcute",
  103: "Exeggutor",
  104: "Cubone",
  105: "Marowak",
  106: "Hitmonlee",
  107: "Hitmonchan",
  108: "Lickitung",
  109: "Koffing",
  110: "Weezing",
  111: "Rhyhorn",
  112: "Rhydon",
  113: "Chansey",
  114: "Tangela",
  115: "Kangaskhan",
  116: "Horsea",
  117: "Seadra",
  118: "Goldeen",
  119: "Seaking",
  120: "Staryu",
  121: "Starmie",
  122: "Mr. Mime",
  123: "Scyther",
  124: "Jynx",
  125: "Electabuzz",
  126: "Magmar",
  127: "Pinsir",
  128: "Tauros",
  129: "Magikarp",
  130: "Gyarados",
  131: "Lapras",
  132: "Ditto",
  133: "Eevee",
  134: "Vaporeon",
  135: "Jolteon",
  136: "Flareon",
  137: "Porygon",
  138: "Omanyte",
  139: "Omastar",
  140: "Kabuto",
  141: "Kabutops",
  142: "Aerodactyl",
  143: "Snorlax",
  144: "Articuno",
  145: "Zapdos",
  146: "Moltres",
  147: "Dratini",
  148: "Dragonair",
  149: "Dragonite",
  150: "Mewtwo",
  151: "Mew"
};
export {
  CANDY_FAMILY_MAP as C,
  EVOLUTION_DATA as E,
  POKEMON_NAMES as P
};
//# sourceMappingURL=evolution-data.js.map
