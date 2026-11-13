// Profile badge definitions — which achievements grant a displayable badge.
// Badges are identified by their achievement id; display names come from
// ACHIEVEMENT_BY_ID[id].label. Badge sprites live in BadgeStrip.tsx.

export const BADGE_ACHIEVEMENT_IDS = [
  "level_10",
  "level_20",
  "level_30",
  "level_40",
  "level_50",
  "lucky_color",
  "legendary_encounter",
  "master_collector",
  "kanto_complete",
  "johto_complete",
  "hoenn_complete",
  "gotta_catch_em_all",
  "netizen",
  "love_of_the_game",
  "social_butterfly",
  "team_player",
  "event_champion",
] as const;

/** Maximum badges a user can display at once. */
export const MAX_DISPLAYED_BADGES = 3;
