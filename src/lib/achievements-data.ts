// Achievement definitions — static TypeScript constants.
// Edit names, descriptions, and rewards here; no DB migration needed.
// These IDs must match the achievement_id values used in the SQL RPCs.

export type TokenReward = "legendary" | "mythical" | "type_pick" | "shiny";

export type AchievementTrigger =
  | "catch_count"
  | "site_count"
  | "shiny_catch"
  | "legendary_catch"
  | "pokedex_complete"
  | "shiny_complete"
  | "streak"
  | "level"
  | "release"
  | "nickname"
  | "friend_count"
  | "trainer_name_change"
  | "avatar_change"
  | "type_coverage";

export type AchievementCategory =
  | "catch"
  | "website"
  | "social"
  | "type"
  | "streak"
  | "pokedex"
  | "shiny"
  | "customization"
  | "level"
  | "legendary";

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  category: AchievementCategory;
  trigger: AchievementTrigger;
  /** The threshold value to meet (e.g. catch count, level, days). 1 for one-time actions. */
  threshold: number;
  /** Increase to users.catch_limit. 0 = badge only. */
  storageReward: number;
  /** Encounter token type, if any. */
  tokenReward: TokenReward | null;
  /** XP granted on claim. Mirrors the values hardcoded in the claim_achievement RPC — keep in sync. */
  xpReward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Catch ──────────────────────────────────────────────────────────────────
  {
    id: "first_steps",
    label: "First Steps",
    description: "Catch your first Pokémon.",
    category: "catch",
    trigger: "catch_count",
    threshold: 1,
    storageReward: 50,
    tokenReward: null,
    xpReward: 500,
  },
  {
    id: "getting_started",
    label: "Getting Started",
    description: "Catch 10 Pokémon.",
    category: "catch",
    trigger: "catch_count",
    threshold: 10,
    storageReward: 100,
    tokenReward: null,
    xpReward: 1000,
  },
  {
    id: "collector",
    label: "Collector",
    description: "Catch 100 Pokémon.",
    category: "catch",
    trigger: "catch_count",
    threshold: 100,
    storageReward: 250,
    tokenReward: "type_pick",
    xpReward: 5000,
  },
  {
    id: "master_collector",
    label: "Master Collector",
    description: "Catch 1,000 Pokémon.",
    category: "catch",
    trigger: "catch_count",
    threshold: 1000,
    storageReward: 500,
    tokenReward: "legendary",
    xpReward: 25000,
  },

  // ── Website ────────────────────────────────────────────────────────────────
  {
    id: "explorer",
    label: "Explorer",
    description: "Catch Pokémon on 10 different websites.",
    category: "website",
    trigger: "site_count",
    threshold: 10,
    storageReward: 100,
    tokenReward: null,
    xpReward: 1000,
  },
  {
    id: "web_surfer",
    label: "Web Surfer",
    description: "Catch Pokémon on 100 different websites.",
    category: "website",
    trigger: "site_count",
    threshold: 100,
    storageReward: 250,
    tokenReward: null,
    xpReward: 5000,
  },
  {
    id: "netizen",
    label: "Netizen",
    description: "Catch Pokémon on 1,000 different websites.",
    category: "website",
    trigger: "site_count",
    threshold: 1000,
    storageReward: 500,
    tokenReward: "legendary",
    xpReward: 25000,
  },

  // ── Social ─────────────────────────────────────────────────────────────────
  {
    id: "letting_go",
    label: "Letting Go",
    description: "Release your first Pokémon.",
    category: "social",
    trigger: "release",
    threshold: 1,
    storageReward: 0,
    tokenReward: null,
    xpReward: 250,
  },
  {
    id: "that_sounds_better",
    label: "That Sounds Better",
    description: "Give a Pokémon a nickname.",
    category: "social",
    trigger: "nickname",
    threshold: 1,
    storageReward: 0,
    tokenReward: null,
    xpReward: 250,
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Add your first friend.",
    category: "social",
    trigger: "friend_count",
    threshold: 1,
    storageReward: 50,
    tokenReward: null,
    xpReward: 500,
  },
  {
    id: "social_butterfly",
    label: "Social Butterfly",
    description: "Have 10 friends.",
    category: "social",
    trigger: "friend_count",
    threshold: 10,
    storageReward: 0,
    tokenReward: null,
    xpReward: 2500,
  },

  // ── Type coverage ──────────────────────────────────────────────────────────
  {
    id: "just_my_type",
    label: "Just My Type",
    description: "Catch at least one Pokémon of every type.",
    category: "type",
    trigger: "type_coverage",
    threshold: 17, // 17 unique types across Gen 1 Pokémon
    storageReward: 250,
    tokenReward: "type_pick",
    xpReward: 5000,
  },

  // ── Streak ─────────────────────────────────────────────────────────────────
  {
    id: "dedicated",
    label: "Dedicated",
    description: "Catch Pokémon 7 days in a row.",
    category: "streak",
    trigger: "streak",
    threshold: 7,
    storageReward: 100,
    tokenReward: null,
    xpReward: 2500,
  },
  {
    id: "love_of_the_game",
    label: "Love of the Game",
    description: "Catch Pokémon 30 days in a row.",
    category: "streak",
    trigger: "streak",
    threshold: 30,
    storageReward: 500,
    tokenReward: "legendary",
    xpReward: 15000,
  },

  // ── Pokédex ────────────────────────────────────────────────────────────────
  {
    id: "gotta_catch_em_all",
    label: "Gotta Catch 'Em All",
    description: "Complete the Gen 1 Pokédex — catch all 151 species.",
    category: "pokedex",
    trigger: "pokedex_complete",
    threshold: 151,
    storageReward: 0,
    tokenReward: "shiny",
    xpReward: 50000,
  },

  // ── Shiny ──────────────────────────────────────────────────────────────────
  {
    id: "lucky_color",
    label: "Lucky Color",
    description: "Catch your first shiny Pokémon.",
    category: "shiny",
    trigger: "shiny_catch",
    threshold: 1,
    storageReward: 0,
    tokenReward: null,
    xpReward: 2500,
  },
  {
    id: "shiny_hunter",
    label: "Shiny Hunter",
    description: "Complete the shiny Pokédex by catching all 151 shiny species.",
    category: "shiny",
    trigger: "shiny_complete",
    threshold: 151,
    storageReward: 2500,
    tokenReward: "mythical",
    xpReward: 100000,
  },

  // ── Customization ──────────────────────────────────────────────────────────
  {
    id: "identity_crisis",
    label: "Identity Crisis",
    description: "Change your trainer name.",
    category: "customization",
    trigger: "trainer_name_change",
    threshold: 1,
    storageReward: 0,
    tokenReward: null,
    xpReward: 250,
  },
  {
    id: "new_look",
    label: "New Look",
    description: "Change your trainer avatar.",
    category: "customization",
    trigger: "avatar_change",
    threshold: 1,
    storageReward: 0,
    tokenReward: null,
    xpReward: 250,
  },

  // ── Level ──────────────────────────────────────────────────────────────────
  {
    id: "level_5",
    label: "Level 5",
    description: "Reach trainer level 5.",
    category: "level",
    trigger: "level",
    threshold: 5,
    storageReward: 100,
    tokenReward: null,
    xpReward: 1000,
  },
  {
    id: "level_10",
    label: "Level 10",
    description: "Reach trainer level 10.",
    category: "level",
    trigger: "level",
    threshold: 10,
    storageReward: 150,
    tokenReward: "type_pick",
    xpReward: 2500,
  },
  {
    id: "level_20",
    label: "Level 20",
    description: "Reach trainer level 20.",
    category: "level",
    trigger: "level",
    threshold: 20,
    storageReward: 250,
    tokenReward: "type_pick",
    xpReward: 5000,
  },
  {
    id: "level_30",
    label: "Level 30",
    description: "Reach trainer level 30.",
    category: "level",
    trigger: "level",
    threshold: 30,
    storageReward: 375,
    tokenReward: "type_pick",
    xpReward: 10000,
  },
  {
    id: "level_40",
    label: "Level 40",
    description: "Reach trainer level 40.",
    category: "level",
    trigger: "level",
    threshold: 40,
    storageReward: 500,
    tokenReward: "type_pick",
    xpReward: 15000,
  },
  {
    id: "level_50",
    label: "Level 50",
    description: "Reach trainer level 50.",
    category: "level",
    trigger: "level",
    threshold: 50,
    storageReward: 750,
    tokenReward: "legendary",
    xpReward: 25000,
  },

  // ── Legendary ──────────────────────────────────────────────────────────────
  {
    id: "legendary_encounter",
    label: "Legendary Encounter",
    description: "Catch a legendary Pokémon.",
    category: "legendary",
    trigger: "legendary_catch",
    threshold: 1,
    storageReward: 0,
    tokenReward: null,
    xpReward: 5000,
  },
];

/** Quick lookup by achievement id. */
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

/** Achievement ids grouped by category for UI rendering. */
export const ACHIEVEMENTS_BY_CATEGORY: Record<AchievementCategory, AchievementDef[]> =
  ACHIEVEMENTS.reduce(
    (acc, a) => {
      (acc[a.category] ??= []).push(a);
      return acc;
    },
    {} as Record<AchievementCategory, AchievementDef[]>
  );

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  catch: "Catching",
  website: "Exploration",
  social: "Social",
  type: "Type Master",
  streak: "Streak",
  pokedex: "Pokédex",
  shiny: "Shiny",
  customization: "Customization",
  level: "Leveling Up",
  legendary: "Legendary",
};
