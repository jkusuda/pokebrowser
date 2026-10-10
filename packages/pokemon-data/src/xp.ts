// AUTO-GENERATED — do not edit manually.
// Run `node packages/pokemon-data/scripts/generate.mjs` to regenerate.
//
// Basic: 100, Middle: 200, Final/single-stage: 300, Legendary/Mythical: 1000
// Shiny bonus: +2000 (stacks with base)
//
// DISPLAY ONLY. The awarded value is computed by the _catch_pokemon RPC, which
// derives the same tiers from the pokemon_species and pokemon_evolutions
// reference tables — so this file cannot drift out of sync with gameplay.

export const POKEMON_BASE_XP: Record<number, number> = {
  1: 100, 2: 200, 3: 300,            // bulbasaur line
  4: 100, 5: 200, 6: 300,            // charmander line
  7: 100, 8: 200, 9: 300,            // squirtle line
  10: 100, 11: 200, 12: 300,         // caterpie line
  13: 100, 14: 200, 15: 300,         // weedle line
  16: 100, 17: 200, 18: 300,         // pidgey line
  19: 100, 20: 300,                  // rattata line
  21: 100, 22: 300,                  // spearow line
  23: 100, 24: 300,                  // ekans line
  25: 200, 26: 300, 172: 100,        // pichu line
  27: 100, 28: 300,                  // sandshrew line
  29: 100, 30: 200, 31: 300,         // nidoran-f line
  32: 100, 33: 200, 34: 300,         // nidoran-m line
  35: 200, 36: 300, 173: 100,        // cleffa line
  37: 100, 38: 300,                  // vulpix line
  39: 200, 40: 300, 174: 100,        // igglybuff line
  41: 100, 42: 200, 169: 300,        // zubat line
  43: 100, 44: 200, 45: 300, 182: 300, // oddish line
  46: 100, 47: 300,                  // paras line
  48: 100, 49: 300,                  // venonat line
  50: 100, 51: 300,                  // diglett line
  52: 100, 53: 300,                  // meowth line
  54: 100, 55: 300,                  // psyduck line
  56: 100, 57: 300,                  // mankey line
  58: 100, 59: 300,                  // growlithe line
  60: 100, 61: 200, 62: 300, 186: 300, // poliwag line
  63: 100, 64: 200, 65: 300,         // abra line
  66: 100, 67: 200, 68: 300,         // machop line
  69: 100, 70: 200, 71: 300,         // bellsprout line
  72: 100, 73: 300,                  // tentacool line
  74: 100, 75: 200, 76: 300,         // geodude line
  77: 100, 78: 300,                  // ponyta line
  79: 100, 80: 300, 199: 300,        // slowpoke line
  81: 100, 82: 300,                  // magnemite line
  83: 300,                           // farfetchd
  84: 100, 85: 300,                  // doduo line
  86: 100, 87: 300,                  // seel line
  88: 100, 89: 300,                  // grimer line
  90: 100, 91: 300,                  // shellder line
  92: 100, 93: 200, 94: 300,         // gastly line
  95: 100, 208: 300,                 // onix line
  96: 100, 97: 300,                  // drowzee line
  98: 100, 99: 300,                  // krabby line
  100: 100, 101: 300,                // voltorb line
  102: 100, 103: 300,                // exeggcute line
  104: 100, 105: 300,                // cubone line
  106: 300, 107: 300, 236: 100, 237: 300, // tyrogue line
  108: 300,                          // lickitung
  109: 100, 110: 300,                // koffing line
  111: 100, 112: 300,                // rhyhorn line
  113: 100, 242: 300,                // chansey line
  114: 300,                          // tangela
  115: 300,                          // kangaskhan
  116: 100, 117: 200, 230: 300,      // horsea line
  118: 100, 119: 300,                // goldeen line
  120: 100, 121: 300,                // staryu line
  122: 300,                          // mr-mime
  123: 100, 212: 300,                // scyther line
  124: 300, 238: 100,                // smoochum line
  125: 300, 239: 100,                // elekid line
  126: 300, 240: 100,                // magby line
  127: 300,                          // pinsir
  128: 300,                          // tauros
  129: 100, 130: 300,                // magikarp line
  131: 300,                          // lapras
  132: 300,                          // ditto
  133: 100, 134: 300, 135: 300, 136: 300, 196: 300, 197: 300, // eevee line
  137: 100, 233: 300,                // porygon line
  138: 100, 139: 300,                // omanyte line
  140: 100, 141: 300,                // kabuto line
  142: 300,                          // aerodactyl
  143: 300,                          // snorlax
  144: 1000,                         // articuno
  145: 1000,                         // zapdos
  146: 1000,                         // moltres
  147: 100, 148: 200, 149: 300,      // dratini line
  150: 1000,                         // mewtwo
  151: 1000,                         // mew
  152: 100, 153: 200, 154: 300,      // chikorita line
  155: 100, 156: 200, 157: 300,      // cyndaquil line
  158: 100, 159: 200, 160: 300,      // totodile line
  161: 100, 162: 300,                // sentret line
  163: 100, 164: 300,                // hoothoot line
  165: 100, 166: 300,                // ledyba line
  167: 100, 168: 300,                // spinarak line
  170: 100, 171: 300,                // chinchou line
  175: 100, 176: 300,                // togepi line
  177: 100, 178: 300,                // natu line
  179: 100, 180: 200, 181: 300,      // mareep line
  183: 200, 184: 300, 298: 100,      // azurill line
  185: 300,                          // sudowoodo
  187: 100, 188: 200, 189: 300,      // hoppip line
  190: 300,                          // aipom
  191: 100, 192: 300,                // sunkern line
  193: 300,                          // yanma
  194: 100, 195: 300,                // wooper line
  198: 300,                          // murkrow
  200: 300,                          // misdreavus
  201: 300,                          // unown
  202: 300, 360: 100,                // wynaut line
  203: 300,                          // girafarig
  204: 100, 205: 300,                // pineco line
  206: 300,                          // dunsparce
  207: 300,                          // gligar
  209: 100, 210: 300,                // snubbull line
  211: 300,                          // qwilfish
  213: 300,                          // shuckle
  214: 300,                          // heracross
  215: 300,                          // sneasel
  216: 100, 217: 300,                // teddiursa line
  218: 100, 219: 300,                // slugma line
  220: 100, 221: 300,                // swinub line
  222: 300,                          // corsola
  223: 100, 224: 300,                // remoraid line
  225: 300,                          // delibird
  226: 300,                          // mantine
  227: 300,                          // skarmory
  228: 100, 229: 300,                // houndour line
  231: 100, 232: 300,                // phanpy line
  234: 300,                          // stantler
  235: 300,                          // smeargle
  241: 300,                          // miltank
  243: 1000,                         // raikou
  244: 1000,                         // entei
  245: 1000,                         // suicune
  246: 100, 247: 200, 248: 300,      // larvitar line
  249: 1000,                         // lugia
  250: 1000,                         // ho-oh
  251: 1000,                         // celebi
  252: 100, 253: 200, 254: 300,      // treecko line
  255: 100, 256: 200, 257: 300,      // torchic line
  258: 100, 259: 200, 260: 300,      // mudkip line
  261: 100, 262: 300,                // poochyena line
  263: 100, 264: 300,                // zigzagoon line
  265: 100, 266: 200, 267: 300, 268: 200, 269: 300, // wurmple line
  270: 100, 271: 200, 272: 300,      // lotad line
  273: 100, 274: 200, 275: 300,      // seedot line
  276: 100, 277: 300,                // taillow line
  278: 100, 279: 300,                // wingull line
  280: 100, 281: 200, 282: 300,      // ralts line
  283: 100, 284: 300,                // surskit line
  285: 100, 286: 300,                // shroomish line
  287: 100, 288: 200, 289: 300,      // slakoth line
  290: 100, 291: 300, 292: 300,      // nincada line
  293: 100, 294: 200, 295: 300,      // whismur line
  296: 100, 297: 300,                // makuhita line
  299: 300,                          // nosepass
  300: 100, 301: 300,                // skitty line
  302: 300,                          // sableye
  303: 300,                          // mawile
  304: 100, 305: 200, 306: 300,      // aron line
  307: 100, 308: 300,                // meditite line
  309: 100, 310: 300,                // electrike line
  311: 300,                          // plusle
  312: 300,                          // minun
  313: 300,                          // volbeat
  314: 300,                          // illumise
  315: 300,                          // roselia
  316: 100, 317: 300,                // gulpin line
  318: 100, 319: 300,                // carvanha line
  320: 100, 321: 300,                // wailmer line
  322: 100, 323: 300,                // numel line
  324: 300,                          // torkoal
  325: 100, 326: 300,                // spoink line
  327: 300,                          // spinda
  328: 100, 329: 200, 330: 300,      // trapinch line
  331: 100, 332: 300,                // cacnea line
  333: 100, 334: 300,                // swablu line
  335: 300,                          // zangoose
  336: 300,                          // seviper
  337: 300,                          // lunatone
  338: 300,                          // solrock
  339: 100, 340: 300,                // barboach line
  341: 100, 342: 300,                // corphish line
  343: 100, 344: 300,                // baltoy line
  345: 100, 346: 300,                // lileep line
  347: 100, 348: 300,                // anorith line
  349: 100, 350: 300,                // feebas line
  351: 300,                          // castform
  352: 300,                          // kecleon
  353: 100, 354: 300,                // shuppet line
  355: 100, 356: 300,                // duskull line
  357: 300,                          // tropius
  358: 300,                          // chimecho
  359: 300,                          // absol
  361: 100, 362: 300,                // snorunt line
  363: 100, 364: 200, 365: 300,      // spheal line
  366: 100, 367: 300, 368: 300,      // clamperl line
  369: 300,                          // relicanth
  370: 300,                          // luvdisc
  371: 100, 372: 200, 373: 300,      // bagon line
  374: 100, 375: 200, 376: 300,      // beldum line
  377: 1000,                         // regirock
  378: 1000,                         // regice
  379: 1000,                         // registeel
  380: 1000,                         // latias
  381: 1000,                         // latios
  382: 1000,                         // kyogre
  383: 1000,                         // groudon
  384: 1000,                         // rayquaza
  385: 1000,                         // jirachi
  386: 1000,                         // deoxys-normal
};

export function getPokemonBaseXp(pokedexNumber: number, isShiny: boolean): number {
  const base = POKEMON_BASE_XP[pokedexNumber] ?? 100;
  return isShiny ? base + 2000 : base;
}
