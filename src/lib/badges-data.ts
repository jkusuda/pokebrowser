// Profile badge definitions — which achievements grant a displayable badge.
// Badges are identified by their achievement id everywhere (users.displayed_badges,
// the /api/trainer/badges route, and components); display names come from
// ACHIEVEMENT_BY_ID[id].label.
//
// Server-safe: imported by API-route validation. No image imports here —
// badge sprites live in BadgeStrip.tsx (same rule as achievements-data.ts).

export const BADGE_ACHIEVEMENT_IDS = [
  "level_10",
  "level_20",
  "level_30",
  "level_40",
  "level_50",
  "lucky_color",
  "legendary_encounter",
  "master_collector",
  "gotta_catch_em_all",
  "netizen",
  "love_of_the_game",
  "social_butterfly",
] as const;

/** Fast membership check for validation. */
export const BADGE_ID_SET = new Set<string>(BADGE_ACHIEVEMENT_IDS);

/** Maximum badges a user can display at once (mirrors set_displayed_badges). */
export const MAX_DISPLAYED_BADGES = 3;
