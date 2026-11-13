// Shapes of the Go API's JSON (services/api/internal/service). Keep in sync.

export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice" | "fighting" | "poison" | "ground"
  | "flying" | "psychic" | "bug" | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export type TokenType = "legendary" | "mythical" | "type_pick" | "shiny" | "species";
export type ThemeId = "green" | "blue";
export type TrackedStat = "total_catches" | "shiny_catches" | "type_catches" | "evolutions" | "unique_species";
export type LeaderboardCategory = "catches" | "sites";
export type LeaderboardScope = "global" | "friends";

export interface Pokemon {
  id: string;
  pokedexNumber: number;
  nickname: string | null;
  isShiny: boolean;
  caughtAt: string;
  caughtOn: string | null;
}

export interface Profile {
  id: string;
  email: string;
  trainerName: string;
  avatarId: string;
  friendCode: string;
  level: number;
  xp: number;
  levelXp: number;
  nextLevelXp: number;
  catchLimit: number;
  unclaimedCandyLevels: number;
  favoritePokemonId: string | null;
  displayedBadges: string[];
  isPrivate: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface Settings {
  theme: ThemeId;
  soundEnabled: boolean;
  encounterAnimationsEnabled: boolean;
  blockedSites: string[];
  hasSeenTutorial: boolean;
}

export interface Stats {
  totalCatches: number;
  totalReleases: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: string[];
  sites: string[];
  typesCaught: PokemonType[];
}

export interface DexEntry {
  pokedexNumber: number;
  unlockedAt: string;
}

export interface Candy {
  familyBaseId: number;
  count: number;
}

export interface Unlock {
  achievementId: string;
  unlockedAt: string;
  claimedAt: string | null;
}

export interface Token {
  id: string;
  tokenType: TokenType;
  typeFilter: PokemonType | null;
  pokedexNumber: number | null;
  eventId: string | null;
  createdAt: string;
}

export interface Trainer {
  id: string;
  trainerName: string;
  avatarId: string;
  friendCode: string;
  level: number;
  xp: number;
  levelXp: number;
  nextLevelXp: number;
  favoritePokemonId: string | null;
  displayedBadges: string[];
}

export interface Friend {
  friendshipId: string;
  since: string;
  trainer: Trainer;
}

export interface Friends {
  accepted: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
}

export interface Me {
  profile: Profile;
  settings: Settings;
  stats: Stats;
  buddy: Pokemon | null;
  pokemon: Pokemon[];
  pokedex: DexEntry[];
  candies: Candy[];
  achievements: Unlock[];
  tokens: Token[];
  friends: Friends;
}

export interface Status {
  boxCount: number;
  catchLimit: number;
  settings: Settings;
  buddy: Pokemon | null;
}

export interface Encounter {
  nonce: string;
  pokedexNumber: number;
  isShiny: boolean;
}

export interface RollResult extends Status {
  encounter: Encounter | null;
  retryAfterMs: number;
}

export interface CatchResult {
  pokemonId: string;
  pokedexNumber: number;
  isShiny: boolean;
  isNewSpecies: boolean;
  newAchievements: string[];
}

export interface Unlocked {
  newAchievements: string[];
}

export interface EvolveResult {
  pokemon: Pokemon;
  isNewSpecies: boolean;
}

export interface Reward {
  storage: number;
  token?: TokenType;
  xp: number;
}

export interface Achievement {
  id: string;
  reward: Reward;
  goal: number;
  progress: number;
  unlockedAt: string | null;
  claimedAt: string | null;
}

export interface ClaimResult {
  storageGranted: number;
  tokenGranted: TokenType | null;
  tokenId: string | null;
  xpGranted: number;
}

export interface FriendProfile extends Trainer {
  friendshipId: string | null;
  buddy: Pokemon | null;
}

export interface LeaderboardEntry {
  rank: number;
  value: number;
  isPrivate: boolean;
  isMe: boolean;
  id: string | null;
  trainerName: string | null;
  avatarId: string | null;
  friendCode: string | null;
  displayedBadges: string[] | null;
}

export interface Board {
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  trackedStat: TrackedStat;
  typeFilter: PokemonType | null;
  xpMultiplier: number;
  candyMultiplier: number;
  shinyMultiplier: number;
  spotlightPokedex: number | null;
  spotlightRate: number | null;
  boostedTypes: PokemonType[];
  typeBoost: number;
  boostedGenerations: number[];
  generationBoost: number;
  communityGoal: number | null;
  goalReachedAt: string | null;
  rewardTokenType: TokenType | null;
  rewardPokedex: number | null;
  finalizedAt: string | null;
  createdAt: string;
  communityProgress?: number;
  myProgress?: number;
}

export interface Events {
  serverNow: string;
  live: GameEvent[];
  upcoming: GameEvent[];
  past: GameEvent[];
}

export interface ProfileInput {
  trainerName?: string;
  avatarId?: string;
  isPrivate?: boolean;
  favoritePokemonId?: string | null;
}

export type SettingsInput = Partial<Settings>;

export interface EventInput {
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  trackedStat: TrackedStat;
  typeFilter: PokemonType | null;
  xpMultiplier: number;
  candyMultiplier: number;
  shinyMultiplier: number;
  spotlightPokedex: number | null;
  spotlightRate: number | null;
  boostedTypes: PokemonType[];
  typeBoost: number;
  boostedGenerations: number[];
  generationBoost: number;
  communityGoal: number | null;
  rewardTokenType: TokenType | null;
  rewardPokedex: number | null;
}

export interface GrantTokenInput {
  tokenType: TokenType;
  typeFilter?: PokemonType | null;
  pokedexNumber?: number | null;
}
