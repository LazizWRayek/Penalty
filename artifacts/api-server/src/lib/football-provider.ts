import type { Footballer } from "./football";

const API_URL = "https://v3.football.api-sports.io";
const REQUEST_TIMEOUT_MS = 6_000;
const MAX_CONCURRENT_REQUESTS = 4;

type ApiFootballPlayer = {
  player?: {
    name?: string;
    nationality?: string | null;
    photo?: string | null;
  };
  statistics?: Array<{
    team?: { name?: string | null };
    league?: { name?: string | null };
  }>;
};

type ApiFootballResponse = {
  response?: ApiFootballPlayer[];
  errors?: Record<string, string>;
};

export type FootballProviderResult = {
  players: Footballer[];
  updatedAt: string;
  provider: "API-Football";
};

function seasonStartYear(now = new Date()) {
  const month = now.getUTCMonth();
  return now.getUTCFullYear() - (month < 6 ? 1 : 0);
}

function getToken() {
  return process.env.API_FOOTBALL_API_KEY?.trim() || null;
}

function isFatalProviderError(error: Error) {
  return /application key|api key|http 401|http 403|exceeded the limit|rate limit/i.test(
    error.message,
  );
}

async function requestPlayers(search: string, season?: number) {
  const token = getToken();
  if (!token) throw new Error("API_FOOTBALL_API_KEY is not configured.");

  const url = new URL(`${API_URL}/players`);
  url.searchParams.set("search", search);
  if (season) url.searchParams.set("season", String(season));
  const response = await fetch(url, {
    headers: { "x-apisports-key": token },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`API-Football returned HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as ApiFootballResponse;
  if (payload.errors && Object.keys(payload.errors).length > 0) {
    throw new Error(Object.values(payload.errors).join("; "));
  }
  return payload.response ?? [];
}

async function requestPlayersWithFallback(search: string) {
  const currentSeason = seasonStartYear();
  const attempts = [currentSeason, currentSeason - 1, undefined];
  let lastError: Error | null = null;
  for (const season of attempts) {
    try {
      const players = await requestPlayers(search, season);
      if (players.length > 0) return players;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Live player lookup failed.");
      if (isFatalProviderError(lastError)) throw lastError;
    }
  }
  if (lastError) throw lastError;
  return [];
}

function playerMatch(search: string, players: ApiFootballPlayer[]) {
  const query = search.trim().toLocaleLowerCase();
  return players.find((entry) => entry.player?.name?.toLocaleLowerCase() === query) ??
    players.find((entry) => entry.player?.name?.toLocaleLowerCase().startsWith(query)) ??
    players[0];
}

export function mergeLivePlayer(
  fallback: Footballer,
  entry: ApiFootballPlayer,
): Footballer {
  const livePlayer = entry.player;
  const statistics = entry.statistics ?? [];
  const currentClubs = statistics
    .map((stat) => stat.team?.name)
    .filter((name): name is string => Boolean(name));
  const currentLeagues = statistics
    .map((stat) => stat.league?.name)
    .filter((name): name is string => Boolean(name));

  return {
    ...fallback,
    ...(livePlayer?.name ? { name: livePlayer.name } : {}),
    ...(livePlayer?.nationality ? { nationality: livePlayer.nationality } : {}),
    clubs: [...new Set([...fallback.clubs, ...currentClubs])],
    leagues: [...new Set([...fallback.leagues, ...currentLeagues])],
    ...(livePlayer?.photo ? { imageUrl: livePlayer.photo } : {}),
  };
}

export function newLivePlayer(entry: ApiFootballPlayer): Footballer | null {
  const player = entry.player;
  if (!player?.name) return null;
  const statistics = entry.statistics ?? [];
  return {
    name: player.name,
    aliases: [],
    nationality: player.nationality ?? "",
    clubs: [...new Set(statistics.map((stat) => stat.team?.name).filter((name): name is string => Boolean(name)))],
    leagues: [...new Set(statistics.map((stat) => stat.league?.name).filter((name): name is string => Boolean(name)))],
    trophies: [],
    ...(player.photo ? { imageUrl: player.photo } : {}),
  };
}

export async function refreshFootballers(
  fallbackPlayers: Footballer[],
): Promise<FootballProviderResult> {
  if (fallbackPlayers.length === 0) {
    throw new Error("The verified football roster is empty.");
  }

  // Validate credentials and provider availability before fan-out. A missing key
  // or rate-limited subscription should make one request, not dozens.
  const preflightPlayer = fallbackPlayers.find(
    (player) => player.name === "Cristiano Ronaldo",
  ) ?? fallbackPlayers[0];
  const prefetched = new Map<string, ApiFootballPlayer[]>([
    [preflightPlayer.name, await requestPlayersWithFallback(preflightPlayer.name)],
  ]);

  const refreshed = [...fallbackPlayers];
  let completed = 0;
  const failures = new Set<string>();

  for (let index = 0; index < fallbackPlayers.length; index += MAX_CONCURRENT_REQUESTS) {
    const batch = fallbackPlayers.slice(index, index + MAX_CONCURRENT_REQUESTS);
    const responses = await Promise.all(batch.map(async (fallback) => {
      try {
        const players = prefetched.get(fallback.name) ??
          await requestPlayersWithFallback(fallback.name);
        return { fallback, match: playerMatch(fallback.name, players), error: null };
      } catch (error) {
        return {
          fallback,
          match: undefined,
          error: error instanceof Error ? error.message : "Live player lookup failed.",
        };
      }
    }));

    for (const { fallback, match, error } of responses) {
      if (error) failures.add(error);
      if (!match) continue;
      const rosterIndex = refreshed.findIndex((player) => player.name === fallback.name);
      if (rosterIndex >= 0) refreshed[rosterIndex] = mergeLivePlayer(fallback, match);
      completed += 1;
    }
  }

  if (completed < Math.max(1, Math.ceil(fallbackPlayers.length / 2))) {
    const failureDetail = failures.size > 0
      ? ` Provider response: ${[...failures].join(" | ")}`
      : "";
    throw new Error(
      `API-Football refreshed ${completed} of ${fallbackPlayers.length} verified players.${failureDetail}`,
    );
  }

  return {
    players: refreshed,
    updatedAt: new Date().toISOString(),
    provider: "API-Football",
  };
}

export async function searchLiveFootballers(search: string) {
  const results = await requestPlayersWithFallback(search);
  return results.map(newLivePlayer).filter((player): player is Footballer => player !== null);
}