import type {
  Achievement, Board, CatchResult, ClaimResult, EventInput, Events, EvolveResult, FriendProfile,
  GameEvent, GrantTokenInput, LeaderboardCategory, LeaderboardScope, Me, Pokemon, PokemonType,
  ProfileInput, RollResult, Settings, SettingsInput, Status, Unlocked,
} from "./types";

// ApiError carries the API's stable error code (e.g. "rate_limited").
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type TokenSource = () => Promise<string | null | undefined>;

export function createApi(baseUrl: string, getToken: TokenSource) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    let res: Response;
    try {
      res = await fetch(baseUrl + path, {
        method,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(body !== undefined && { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      throw new ApiError(0, "network", "Can't reach the server");
    }
    if (res.status === 204) return undefined as T;
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, json?.error?.code ?? "internal", json?.error?.message ?? "Request failed");
    }
    return json as T;
  }

  const get = <T>(path: string) => request<T>("GET", path);
  const id = encodeURIComponent;

  return {
    me: () => get<Me>("/v1/me"),
    status: () => get<Status>("/v1/me/status"),
    updateProfile: (input: ProfileInput) => request<Unlocked>("PATCH", "/v1/me", input),
    updateSettings: (input: SettingsInput) => request<Settings>("PATCH", "/v1/me/settings", input),
    setBadges: (badgeIds: string[]) => request<void>("PUT", "/v1/me/badges", { badgeIds }),

    roll: () => request<RollResult>("POST", "/v1/encounters/roll"),
    catchPokemon: (nonce: string, caughtOn: string | null) =>
      request<CatchResult>("POST", "/v1/catches", { nonce, caughtOn: caughtOn ?? "" }),

    recentPokemon: (limit: number) => get<Pokemon[]>(`/v1/pokemon?recent=${limit}`),
    renamePokemon: (pokemonId: string, nickname: string) =>
      request<Unlocked>("PATCH", `/v1/pokemon/${id(pokemonId)}`, { nickname }),
    releasePokemon: (pokemonId: string) => request<Unlocked>("DELETE", `/v1/pokemon/${id(pokemonId)}`),
    evolvePokemon: (pokemonId: string, targetId?: number) =>
      request<EvolveResult>("POST", `/v1/pokemon/${id(pokemonId)}/evolve`, targetId ? { targetId } : undefined),

    achievements: () => get<Achievement[]>("/v1/achievements"),
    claimAchievement: (achievementId: string) =>
      request<ClaimResult>("POST", `/v1/achievements/${id(achievementId)}/claim`),
    openToken: (tokenId: string) => request<CatchResult>("POST", `/v1/tokens/${id(tokenId)}/open`),
    setTokenType: (tokenId: string, typeFilter: PokemonType) =>
      request<void>("PATCH", `/v1/tokens/${id(tokenId)}`, { typeFilter }),
    claimCandy: (pokedexNumber: number) => request<void>("POST", "/v1/rewards/candy", { pokedexNumber }),

    addFriend: (friendCode: string) => request<{ friendshipId: string }>("POST", "/v1/friends", { friendCode }),
    acceptFriend: (friendshipId: string) => request<Unlocked>("POST", `/v1/friends/${id(friendshipId)}/accept`),
    removeFriend: (friendshipId: string) => request<void>("DELETE", `/v1/friends/${id(friendshipId)}`),
    trainer: (friendCode: string) => get<FriendProfile>(`/v1/trainers/${id(friendCode)}`),

    leaderboard: (category: LeaderboardCategory, scope: LeaderboardScope) =>
      get<Board>(`/v1/leaderboard?category=${category}&scope=${scope}`),
    events: () => get<Events>("/v1/events"),
    eventLeaderboard: (eventId: string) => get<Board>(`/v1/events/${id(eventId)}/leaderboard`),

    admin: {
      events: () => get<GameEvent[]>("/v1/admin/events"),
      createEvent: (input: EventInput) => request<{ id: string }>("POST", "/v1/admin/events", input),
      updateEvent: (eventId: string, input: EventInput) => request<void>("PUT", `/v1/admin/events/${id(eventId)}`, input),
      deleteEvent: (eventId: string) => request<void>("DELETE", `/v1/admin/events/${id(eventId)}`),
      addXp: (amount: number) => request<{ xp: number; level: number }>("POST", "/v1/admin/xp", { amount }),
      grantToken: (input: GrantTokenInput) => request<void>("POST", "/v1/admin/tokens", input),
      unlockAchievement: (achievementId: string) =>
        request<Unlocked>("POST", "/v1/admin/achievements", { achievementId }),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
