// AUTO-GENERATED — do not edit manually.
// Run `node packages/pokemon-data/scripts/generate.mjs` to regenerate.
//
// Maps every Pokémon to its base-form Pokédex number.
// Used for shared candy pools (e.g. Sandslash → Sandshrew candy), and mirrored
// by pokemon_species.family_base_id in the database.

export const POKEMON_FAMILIES: Record<number, number> = {
  1: 1, 2: 1, 3: 1,                  // bulbasaur line
  4: 4, 5: 4, 6: 4,                  // charmander line
  7: 7, 8: 7, 9: 7,                  // squirtle line
  10: 10, 11: 10, 12: 10,            // caterpie line
  13: 13, 14: 13, 15: 13,            // weedle line
  16: 16, 17: 16, 18: 16,            // pidgey line
  19: 19, 20: 19,                    // rattata line
  21: 21, 22: 21,                    // spearow line
  23: 23, 24: 23,                    // ekans line
  27: 27, 28: 27,                    // sandshrew line
  29: 29, 30: 29, 31: 29,            // nidoran-f line
  32: 32, 33: 32, 34: 32,            // nidoran-m line
  37: 37, 38: 37,                    // vulpix line
  41: 41, 42: 41, 169: 41,           // zubat line
  43: 43, 44: 43, 45: 43, 182: 43,   // oddish line
  46: 46, 47: 46,                    // paras line
  48: 48, 49: 48,                    // venonat line
  50: 50, 51: 50,                    // diglett line
  52: 52, 53: 52,                    // meowth line
  54: 54, 55: 54,                    // psyduck line
  56: 56, 57: 56,                    // mankey line
  58: 58, 59: 58,                    // growlithe line
  60: 60, 61: 60, 62: 60, 186: 60,   // poliwag line
  63: 63, 64: 63, 65: 63,            // abra line
  66: 66, 67: 66, 68: 66,            // machop line
  69: 69, 70: 69, 71: 69,            // bellsprout line
  72: 72, 73: 72,                    // tentacool line
  74: 74, 75: 74, 76: 74,            // geodude line
  77: 77, 78: 77,                    // ponyta line
  79: 79, 80: 79, 199: 79,           // slowpoke line
  81: 81, 82: 81,                    // magnemite line
  83: 83,                            // farfetchd
  84: 84, 85: 84,                    // doduo line
  86: 86, 87: 86,                    // seel line
  88: 88, 89: 88,                    // grimer line
  90: 90, 91: 90,                    // shellder line
  92: 92, 93: 92, 94: 92,            // gastly line
  95: 95, 208: 95,                   // onix line
  96: 96, 97: 96,                    // drowzee line
  98: 98, 99: 98,                    // krabby line
  100: 100, 101: 100,                // voltorb line
  102: 102, 103: 102,                // exeggcute line
  104: 104, 105: 104,                // cubone line
  108: 108,                          // lickitung
  109: 109, 110: 109,                // koffing line
  111: 111, 112: 111,                // rhyhorn line
  113: 113, 242: 113,                // chansey line
  114: 114,                          // tangela
  115: 115,                          // kangaskhan
  116: 116, 117: 116, 230: 116,      // horsea line
  118: 118, 119: 118,                // goldeen line
  120: 120, 121: 120,                // staryu line
  122: 122,                          // mr-mime
  123: 123, 212: 123,                // scyther line
  127: 127,                          // pinsir
  128: 128,                          // tauros
  129: 129, 130: 129,                // magikarp line
  131: 131,                          // lapras
  132: 132,                          // ditto
  133: 133, 134: 133, 135: 133, 136: 133, 196: 133, 197: 133, // eevee line
  137: 137, 233: 137,                // porygon line
  138: 138, 139: 138,                // omanyte line
  140: 140, 141: 140,                // kabuto line
  142: 142,                          // aerodactyl
  143: 143,                          // snorlax
  144: 144,                          // articuno
  145: 145,                          // zapdos
  146: 146,                          // moltres
  147: 147, 148: 147, 149: 147,      // dratini line
  150: 150,                          // mewtwo
  151: 151,                          // mew
  152: 152, 153: 152, 154: 152,      // chikorita line
  155: 155, 156: 155, 157: 155,      // cyndaquil line
  158: 158, 159: 158, 160: 158,      // totodile line
  161: 161, 162: 161,                // sentret line
  163: 163, 164: 163,                // hoothoot line
  165: 165, 166: 165,                // ledyba line
  167: 167, 168: 167,                // spinarak line
  170: 170, 171: 170,                // chinchou line
  25: 172, 26: 172, 172: 172,        // pichu line
  35: 173, 36: 173, 173: 173,        // cleffa line
  39: 174, 40: 174, 174: 174,        // igglybuff line
  175: 175, 176: 175,                // togepi line
  177: 177, 178: 177,                // natu line
  179: 179, 180: 179, 181: 179,      // mareep line
  185: 185,                          // sudowoodo
  187: 187, 188: 187, 189: 187,      // hoppip line
  190: 190,                          // aipom
  191: 191, 192: 191,                // sunkern line
  193: 193,                          // yanma
  194: 194, 195: 194,                // wooper line
  198: 198,                          // murkrow
  200: 200,                          // misdreavus
  201: 201,                          // unown
  203: 203,                          // girafarig
  204: 204, 205: 204,                // pineco line
  206: 206,                          // dunsparce
  207: 207,                          // gligar
  209: 209, 210: 209,                // snubbull line
  211: 211,                          // qwilfish
  213: 213,                          // shuckle
  214: 214,                          // heracross
  215: 215,                          // sneasel
  216: 216, 217: 216,                // teddiursa line
  218: 218, 219: 218,                // slugma line
  220: 220, 221: 220,                // swinub line
  222: 222,                          // corsola
  223: 223, 224: 223,                // remoraid line
  225: 225,                          // delibird
  226: 226,                          // mantine
  227: 227,                          // skarmory
  228: 228, 229: 228,                // houndour line
  231: 231, 232: 231,                // phanpy line
  234: 234,                          // stantler
  235: 235,                          // smeargle
  106: 236, 107: 236, 236: 236, 237: 236, // tyrogue line
  124: 238, 238: 238,                // smoochum line
  125: 239, 239: 239,                // elekid line
  126: 240, 240: 240,                // magby line
  241: 241,                          // miltank
  243: 243,                          // raikou
  244: 244,                          // entei
  245: 245,                          // suicune
  246: 246, 247: 246, 248: 246,      // larvitar line
  249: 249,                          // lugia
  250: 250,                          // ho-oh
  251: 251,                          // celebi
  252: 252, 253: 252, 254: 252,      // treecko line
  255: 255, 256: 255, 257: 255,      // torchic line
  258: 258, 259: 258, 260: 258,      // mudkip line
  261: 261, 262: 261,                // poochyena line
  263: 263, 264: 263,                // zigzagoon line
  265: 265, 266: 265, 267: 265, 268: 265, 269: 265, // wurmple line
  270: 270, 271: 270, 272: 270,      // lotad line
  273: 273, 274: 273, 275: 273,      // seedot line
  276: 276, 277: 276,                // taillow line
  278: 278, 279: 278,                // wingull line
  280: 280, 281: 280, 282: 280,      // ralts line
  283: 283, 284: 283,                // surskit line
  285: 285, 286: 285,                // shroomish line
  287: 287, 288: 287, 289: 287,      // slakoth line
  290: 290, 291: 290, 292: 290,      // nincada line
  293: 293, 294: 293, 295: 293,      // whismur line
  296: 296, 297: 296,                // makuhita line
  183: 298, 184: 298, 298: 298,      // azurill line
  299: 299,                          // nosepass
  300: 300, 301: 300,                // skitty line
  302: 302,                          // sableye
  303: 303,                          // mawile
  304: 304, 305: 304, 306: 304,      // aron line
  307: 307, 308: 307,                // meditite line
  309: 309, 310: 309,                // electrike line
  311: 311,                          // plusle
  312: 312,                          // minun
  313: 313,                          // volbeat
  314: 314,                          // illumise
  315: 315,                          // roselia
  316: 316, 317: 316,                // gulpin line
  318: 318, 319: 318,                // carvanha line
  320: 320, 321: 320,                // wailmer line
  322: 322, 323: 322,                // numel line
  324: 324,                          // torkoal
  325: 325, 326: 325,                // spoink line
  327: 327,                          // spinda
  328: 328, 329: 328, 330: 328,      // trapinch line
  331: 331, 332: 331,                // cacnea line
  333: 333, 334: 333,                // swablu line
  335: 335,                          // zangoose
  336: 336,                          // seviper
  337: 337,                          // lunatone
  338: 338,                          // solrock
  339: 339, 340: 339,                // barboach line
  341: 341, 342: 341,                // corphish line
  343: 343, 344: 343,                // baltoy line
  345: 345, 346: 345,                // lileep line
  347: 347, 348: 347,                // anorith line
  349: 349, 350: 349,                // feebas line
  351: 351,                          // castform
  352: 352,                          // kecleon
  353: 353, 354: 353,                // shuppet line
  355: 355, 356: 355,                // duskull line
  357: 357,                          // tropius
  358: 358,                          // chimecho
  359: 359,                          // absol
  202: 360, 360: 360,                // wynaut line
  361: 361, 362: 361,                // snorunt line
  363: 363, 364: 363, 365: 363,      // spheal line
  366: 366, 367: 366, 368: 366,      // clamperl line
  369: 369,                          // relicanth
  370: 370,                          // luvdisc
  371: 371, 372: 371, 373: 371,      // bagon line
  374: 374, 375: 374, 376: 374,      // beldum line
  377: 377,                          // regirock
  378: 378,                          // regice
  379: 379,                          // registeel
  380: 380,                          // latias
  381: 381,                          // latios
  382: 382,                          // kyogre
  383: 383,                          // groudon
  384: 384,                          // rayquaza
  385: 385,                          // jirachi
  386: 386,                          // deoxys-normal
};

export function getFamilyId(pokedexNumber: number): number {
  return POKEMON_FAMILIES[pokedexNumber] ?? pokedexNumber;
}
