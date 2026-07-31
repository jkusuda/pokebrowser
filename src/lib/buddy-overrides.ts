// Per-Pokémon corrections for the buddy sprite on a trainer card.
//
// The default sizing (`getBuddySpriteLayout` in `./pokemon.ts`) scales the sprite
// by the Pokémon's real-world height, which is what makes Onix tower over the
// card and Diglett sit at ankle height. That's the intended feel, but it can't
// account for quirks in the individual sprite art, so those are corrected here.
//
// Three kinds of quirk, all measured from the alpha bounding box of the animated
// Gen 5 sprites that `getPokemonSprite` serves:
//
//  1. `scale` — the smallest Pokémon have so little art that height-based sizing
//     renders them as specks (Diglett was 28 px of visible content). Bumped so
//     nothing reads below ~60 px.
//  2. `dy` — flyers and levitators hover *inside their own sprite frame* on a
//     cushion of transparent padding. Since the frame is bottom-anchored, that
//     padding pushes them up off the ground line (Haunter floated 67 px). Pulled
//     back down, keeping a deliberate ~14 px hover for things that fly and ~6 px
//     for things that float in water.
//  3. `dx` — some frames carry a wide band of empty pixels on the left, which
//     shoves the buddy right and tucks it behind the trainer avatar (Venomoth
//     had 99 px of dead space). Pulled left to reclaim it.
//
// Values are in final on-screen pixels, applied after `scale`. Everything here
// is hand-tunable — nudge a number, reload the profile, done. Pokémon with no
// entry use the defaults.

export type BuddyOverride = {
  /** Multiplies the height-derived sprite height. */
  scale?: number;
  /** Horizontal nudge from the default 8 px left inset (negative = left). */
  dx?: number;
  /** Vertical nudge from the default 64 px ground line (negative = down). */
  dy?: number;
};

/** The card's default buddy placement, before any override. */
export const BUDDY_GROUND_PX = 64;
export const BUDDY_EDGE_PX = 8;

export const BUDDY_OVERRIDES: Record<number, BuddyOverride> = {
  // --- Too small at real-world scale ---
  1: { dx: 23, dy: 8 },  // bulbasaur
4: { dx: 37, dy: 14 },  // charmander
5: { dx: 13 },  // charmeleon
6: { scale: 1.13, dx: 7, dy: 12 },  // charizard
7: { scale: 1.22, dx: 37, dy: 18 },  // squirtle
10: { scale: 1.66, dx: 46, dy: 18 },  // caterpie
11: { dx: 30 },  // metapod
12: { dy: 150 },  // butterfree
13: { scale: 1.91, dx: 43, dy: 12 },  // weedle
14: { dx: 47 },  // kakuna
15: { scale: 1.24, dx: -18, dy: 108 },  // beedrill
16: { scale: 2.06, dx: 46, dy: 14 },  // pidgey
17: { scale: 1.61, dx: 21, dy: 150 },  // pidgeotto
18: { dx: 13, dy: 15 },  // pidgeot
19: { scale: 1.75, dx: 44, dy: 16 },  // rattata
20: { scale: 1.23, dx: 6, dy: 13 },  // raticate
21: { scale: 1.83, dx: 48, dy: 14 },  // spearow
22: { scale: 1.66, dx: 13, dy: 150 },  // fearow
23: { scale: 0.36, dx: 27, dy: 16 },  // ekans
24: { scale: 0.62, dx: -20, dy: 40 },  // arbok
25: { scale: 1.46, dx: 29, dy: 17 },  // pikachu
26: { scale: 1.91, dx: -43, dy: 11 },  // raichu
27: { dx: 31, dy: 19 },  // sandshrew
28: { dy: 16 },  // sandslash
29: { dx: 35, dy: 18 },  // nidoran♀
31: { scale: 1.11, dx: -9, dy: 11 },  // nidoqueen
32: { dx: 28, dy: 12 },  // nidoran♂
34: { scale: 1.16, dx: -13, dy: 11 },  // nidoking
35: { dy: 19 },  // clefairy
36: { dy: 15 },  // clefable
37: { dx: 21, dy: 18 },  // vulpix
38: { scale: 1.37, dx: -39, dy: 6 },  // ninetales
39: { scale: 1.5, dx: 6, dy: 11 },  // jigglypuff
40: { scale: 1.8, dx: 8, dy: 10 },  // wigglytuff
41: { dx: 22, dy: 150 },  // zubat
42: { dx: -9, dy: 150 },  // golbat
43: { scale: 1.51, dx: 31, dy: 19 },  // oddish
44: { dx: 11, dy: 15 },  // gloom
45: { dy: 13 },  // vileplume
46: { scale: 1.3, dx: 40, dy: 10 },  // paras
48: { dx: 14, dy: 16 },  // venonat
49: { dx: -35, dy: 150 },  // venomoth
50: { scale: 2.15, dx: 37 },  // diglett
52: { scale: 2.09, dx: 42, dy: 18 },  // meowth
53: { dx: 27, dy: 9 },  // persian
54: { dx: 26, dy: 10 },  // psyduck
56: { scale: 1.53, dx: 14, dy: 17 },  // mankey
57: { scale: 1.12, dx: -9, dy: 13 },  // primeape
58: { dx: 18, dy: 10 },  // growlithe
60: { dx: 23 },  // poliwag
66: { dx: 15 },  // machop
69: { dx: 29 },  // bellsprout
72: { scale: 1.02, dx: 12 },  // tentacool
74: { scale: 1.85, dx: -1, dy: 54 },  // geodude
77: { dx: 32 },  // ponyta
78: { dx: 30 },  // rapidash
81: { scale: 1.8, dx: 23, dy: 150 },  // magnemite
82: { dy: 150 },  // magneton
83: { dx: 27 },  // farfetch'd
90: { scale: 1.6, dx: 58, dy: 14 },  // shellder
92: { dy: 150 },  // gastly
93: { dx: -32, dy: 97 },  // haunter
98: { scale: 1.39, dx: 10, dy: 7 },  // krabby
100: { dx: 41 },  // voltorb
102: { scale: 1.15, dx: 35 },  // exeggcute
104: { scale: 1.83, dx: 1, dy: 18 },  // cubone
106: { scale: 1.34, dx: -43 },  // hitmonlee
107: { dx: 27 },  // hitmonchan
109: { scale: 1.1, dx: 6, dy: 150 },  // koffing
110: { dx: -31, dy: 150 },  // weezing
115: { scale: 0.81, dx: -27 },  // kangaskhan
116: { scale: 1.2, dx: 69, dy: 37 },  // horsea
118: { dx: 14, dy: 28 },  // goldeen
120: { dx: 13 },  // staryu
129: { dx: 38 },  // magikarp
130: { scale: 0.3, dy: 6 },  // gyarados
132: { scale: 1.45, dx: 38 },  // ditto
133: { scale: 2.24, dx: 50 },  // eevee
134: { dx: 14 },  // vaporeon
135: { dx: 16 },  // jolteon
136: { dx: 7, dy: 9 },  // flareon
137: { dx: 8, dy: 43 },  // porygon
140: { dx: 53 },  // kabuto
141: { scale: 1.24, dx: -5, dy: -5 },  // kabutops
144: { dx: 17, dy: 150 },  // articuno
145: { dy: 150 },  // zapdos
146: { dx: 7, dy: 150 },  // moltres
147: { scale: 0.44, dx: 24, dy: -2 },  // dratini
151: { scale: 1.63, dx: 32, dy: 150 },  // mew

  // --- The four giants: reined in enough to actually see them ---
  // Overflowing the card is intentional for these — the size *is* the reward —
  // but at true height-scale only 5–44% of the art landed inside the sprite
  // area, and Onix was a blank card (1331px of content in a ~390px box, mostly
  // off to the right). Scaled to ~360px of content: still by far the largest
  // buddies in the game, still spilling out of the frame, but recognisable.
  95: { scale: 0.27, dx: -10, dy: -5 },   // onix — was 5% visible
  148: { scale: 0.63, dx: -21 },          // dragonair — was 31% visible

  // --- Dead space on the left, shoved behind the trainer ---
  65: { dx: -30 },                        // alakazam
  70: { dx: -28 },                        // weepinbell
  94: { dx: -33 },                        // gengar
  103: { dx: -34 },                       // exeggutor
  108: { dx: -35 },                       // lickitung
  126: { dx: -26 },                       // magmar
  143: { dx: -30 },                       // snorlax
};
