// Display text for achievements. Ids match the API's; goals, progress and
// rewards come from GET /v1/achievements.

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
  | "legendary"
  | "event";

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  category: AchievementCategory;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_steps",
    label: "First Steps",
    description: "Catch your first Pokémon.",
    category: "catch",
  },
  {
    id: "getting_started",
    label: "Getting Started",
    description: "Catch 10 Pokémon.",
    category: "catch",
  },
  {
    id: "collector",
    label: "Collector",
    description: "Catch 100 Pokémon.",
    category: "catch",
  },
  {
    id: "master_collector",
    label: "Master Collector",
    description: "Catch 1,000 Pokémon.",
    category: "catch",
  },

  {
    id: "explorer",
    label: "Explorer",
    description: "Catch Pokémon on 10 different websites.",
    category: "website",
  },
  {
    id: "web_surfer",
    label: "Web Surfer",
    description: "Catch Pokémon on 100 different websites.",
    category: "website",
  },
  {
    id: "netizen",
    label: "Netizen",
    description: "Catch Pokémon on 1,000 different websites.",
    category: "website",
  },

  {
    id: "letting_go",
    label: "Letting Go",
    description: "Release your first Pokémon.",
    category: "social",
  },
  {
    id: "that_sounds_better",
    label: "That Sounds Better",
    description: "Give a Pokémon a nickname.",
    category: "social",
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Add your first friend.",
    category: "social",
  },
  {
    id: "social_butterfly",
    label: "Social Butterfly",
    description: "Have 10 friends.",
    category: "social",
  },

  {
    id: "just_my_type",
    label: "Just My Type",
    description: "Catch at least one Pokémon of every type.",
    category: "type",
  },

  {
    id: "dedicated",
    label: "Dedicated",
    description: "Catch Pokémon 7 days in a row.",
    category: "streak",
  },
  {
    id: "love_of_the_game",
    label: "Love of the Game",
    description: "Catch Pokémon 30 days in a row.",
    category: "streak",
  },

  {
    id: "kanto_complete",
    label: "Kanto Champion",
    description: "Catch all 151 species from the Kanto region.",
    category: "pokedex",
  },
  {
    id: "johto_complete",
    label: "Johto Champion",
    description: "Catch all 100 species from the Johto region.",
    category: "pokedex",
  },
  {
    id: "hoenn_complete",
    label: "Hoenn Champion",
    description: "Catch all 135 species from the Hoenn region.",
    category: "pokedex",
  },
  {
    id: "gotta_catch_em_all",
    label: "Gotta Catch 'Em All",
    description: "Complete the Pokédex — catch all 386 species.",
    category: "pokedex",
  },

  {
    id: "lucky_color",
    label: "Lucky Color",
    description: "Catch your first shiny Pokémon.",
    category: "shiny",
  },
  {
    id: "shiny_hunter",
    label: "Shiny Hunter",
    description: "Complete the shiny Kanto Pokédex — all 151 species, shiny.",
    category: "shiny",
  },

  {
    id: "identity_crisis",
    label: "Identity Crisis",
    description: "Change your trainer name.",
    category: "customization",
  },
  {
    id: "new_look",
    label: "New Look",
    description: "Change your trainer avatar.",
    category: "customization",
  },

  {
    id: "level_5",
    label: "Level 5",
    description: "Reach trainer level 5.",
    category: "level",
  },
  {
    id: "level_10",
    label: "Level 10",
    description: "Reach trainer level 10.",
    category: "level",
  },
  {
    id: "level_20",
    label: "Level 20",
    description: "Reach trainer level 20.",
    category: "level",
  },
  {
    id: "level_30",
    label: "Level 30",
    description: "Reach trainer level 30.",
    category: "level",
  },
  {
    id: "level_40",
    label: "Level 40",
    description: "Reach trainer level 40.",
    category: "level",
  },
  {
    id: "level_50",
    label: "Level 50",
    description: "Reach trainer level 50.",
    category: "level",
  },

  {
    id: "legendary_encounter",
    label: "Legendary Encounter",
    description: "Catch a legendary Pokémon.",
    category: "legendary",
  },

  {
    id: "team_player",
    label: "Team Player",
    description: "Help reach an event's community goal.",
    category: "event",
  },
  {
    id: "event_champion",
    label: "Event Champion",
    description: "Finish in the top 3 of any event.",
    category: "event",
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
  event: "Events",
};
