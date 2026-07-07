// Quadratic level curve. Cumulative XP required to reach level n is
// 500 * n * (n - 1), i.e. each level n -> n+1 costs 1000 * n XP.
// This must stay in sync with the formula inside the perform_catch RPC.

export function getXpForLevel(level: number): number {
  return 500 * level * (level - 1);
}

export function getLevelForXp(xp: number): number {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 125)) / 2));
}

export interface LevelProgress {
  level: number;
  /** XP earned within the current level */
  current: number;
  /** XP needed to go from the current level to the next */
  required: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const level = getLevelForXp(xp);
  const base = getXpForLevel(level);
  return { level, current: xp - base, required: getXpForLevel(level + 1) - base };
}
