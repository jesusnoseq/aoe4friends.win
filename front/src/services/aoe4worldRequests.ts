import { Game } from "./aoe4worldTypes.request";
import LZString from "lz-string";
import { API_BASE_URL } from "./apiConfig";
import { type CBTPlayer, type RatingMode } from "./balancedTeamsLogic";

// Fetch all games for a profile_id, with paging, and cache in localStorage
export async function fetchGamesWithCache(profileId: number): Promise<Game[]> {
  const cacheKey = `aoe4friends_games_${profileId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const cachedGames: Game[] = JSON.parse(LZString.decompress(cached) || "[]");
    const cachedIds = new Set(cachedGames.map(g => g.game_id));
    const newGames: Game[] = [];
    let page = 1;

    outer: while (true) {
      const url = `${API_BASE_URL}/v0/players/${profileId}/games?page=${page}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to fetch games');
      const data = await resp.json();
      if (!data.games?.length) break;

      for (const game of data.games) {
        if (cachedIds.has(game.game_id)) {
          break outer;
        }
        newGames.push(game);
      }
      if (data.total_count <= data.page * data.per_page) break;
      page++;
    }

    if (newGames.length) {
      const updated = newGames.concat(cachedGames);
      localStorage.setItem(cacheKey, LZString.compress(JSON.stringify(updated)));
      return updated;
    }
    return cachedGames;
  }

  let allGames: Game[] = [];
  let page = 1;
  while (true) {
    const url = `${API_BASE_URL}/v0/players/${profileId}/games?page=${page}`;
    console.log(`Fetching games from ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch games');
    const data = await resp.json();
    if (!data.games || data.games.length === 0) break;
    allGames = allGames.concat(data.games);
    console.log(`Fetched ${data.games.length} games, total: ${allGames.length}`);
    console.log(data.page, data.per_page, data.total_count, data.total_count <= (data.page*data.per_page));
    if (data.total_count <= (data.page*data.per_page)) break;
    console.log(`Next page: ${page+1}`);
    page++;
  }
  try {
    localStorage.setItem(cacheKey, LZString.compress(JSON.stringify(allGames)));
  } catch (e: unknown) {
    if (e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('localStorage quota exceeded, not caching games.');
    } else {
      throw e;
    }
  }
  return allGames;
}

// --- CBT (Create Balanced Teams) helpers ---

export interface CBTPlayerProfile {
  profile_id: number;
  name: string;
  ratings: {
    rm_1v1?: number;
    qm_1v1?: number;
    rm_2v2?: number;
    qm_2v2?: number;
    rm_3v3?: number;
    qm_3v3?: number;
    rm_4v4?: number;
    qm_4v4?: number;
  };
}

interface RawPlayerData {
  profile_id: number;
  name: string;
  leaderboards?: Record<string, { rating?: number } | undefined>;
  modes?: Record<string, { rating?: number } | undefined>;
  [key: string]: unknown;
}

function parseCBTProfile(raw: RawPlayerData): CBTPlayerProfile {
  const data = raw as Record<string, unknown>;
  const getRating = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const direct = data[key];
      if (direct && typeof direct === 'object' && 'rating' in (direct as object)) {
        const r = (direct as { rating?: number }).rating;
        if (r !== undefined) return r;
      }
      const lb = raw.leaderboards?.[key];
      if (lb?.rating !== undefined) return lb.rating;
      const md = raw.modes?.[key];
      if (md?.rating !== undefined) return md.rating;
    }
    return undefined;
  };
  return {
    profile_id: raw.profile_id,
    name: raw.name,
    ratings: {
      rm_1v1: getRating('rm_1v1', 'rm_1v1_elo', 'rm_solo'),
      qm_1v1: getRating('qm_1v1', 'qm_solo'),
      rm_2v2: getRating('rm_2v2', 'rm_2v2_elo'),
      qm_2v2: getRating('qm_2v2'),
      rm_3v3: getRating('rm_3v3', 'rm_3v3_elo'),
      qm_3v3: getRating('qm_3v3'),
      rm_4v4: getRating('rm_4v4', 'rm_4v4_elo'),
      qm_4v4: getRating('qm_4v4'),
    },
  };
}

export async function fetchPlayerProfileForCBT(profileId: number): Promise<CBTPlayerProfile> {
  const res = await fetch(`${API_BASE_URL}/v0/players/${profileId}`);
  if (!res.ok) throw new Error(`Failed to fetch player ${profileId}`);
  return parseCBTProfile(await res.json());
}

// --- Balance Checker helpers ---

// The single-game endpoint returns team members as flat player objects,
// NOT wrapped in { player: {...} } like the paginated games list.
interface SingleGamePlayer {
  profile_id: number;
  name: string;
  result?: string | null;
  rating?: number | null;
  mmr?: number | null;
}

interface SingleGameResponse {
  game_id: number;
  map: string;
  kind?: string;
  leaderboard?: string;
  ongoing?: boolean;
  teams: SingleGamePlayer[][];
}

export interface CheckedGame {
  game_id: number;
  map: string;
  leaderboard: string;
  mode: RatingMode;
  ongoing: boolean;
  team1: CBTPlayer[];
  team2: CBTPlayer[];
  team1Won?: boolean;
}

// Accepts a plain game id or an aoe4world game URL like
// https://aoe4world.com/players/3995534-jesusnoseq/games/241337674?sig=...
export function parseGameId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/games\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function leaderboardToRatingMode(leaderboard: string, teamSize: number): RatingMode {
  const bySize: RatingMode = teamSize <= 1 ? 'rm_1v1' : teamSize === 2 ? 'rm_2v2' : teamSize === 3 ? 'rm_3v3' : 'rm_4v4';
  if (leaderboard === 'rm_solo' || leaderboard === 'rm_1v1') return 'rm_1v1';
  if (leaderboard === 'qm_solo' || leaderboard === 'qm_1v1') return 'qm_1v1';
  const prefixes: RatingMode[] = ['rm_2v2', 'qm_2v2', 'rm_3v3', 'qm_3v3', 'rm_4v4', 'qm_4v4'];
  for (const p of prefixes) {
    if (leaderboard.startsWith(p)) return p;
  }
  return bySize;
}

function parseCheckedGame(data: SingleGameResponse): CheckedGame {
  if (!Array.isArray(data.teams) || data.teams.length < 2) {
    throw new Error(`Game ${data.game_id} has no team data`);
  }

  const leaderboard = data.leaderboard || data.kind || '';
  const teamSize = Math.max(...data.teams.map(t => t.length));
  const mode = leaderboardToRatingMode(leaderboard, teamSize);

  const toCBTPlayer = (p: SingleGamePlayer): CBTPlayer => ({
    profile_id: p.profile_id,
    name: p.name,
    ratings: { [mode]: p.rating ?? p.mmr ?? undefined },
  });

  const team1Result = data.teams[0].find(p => p.result === 'win' || p.result === 'loss')?.result;

  return {
    game_id: data.game_id,
    map: data.map,
    leaderboard,
    mode,
    ongoing: data.ongoing ?? false,
    team1: data.teams[0].map(toCBTPlayer),
    team2: data.teams[1].map(toCBTPlayer),
    team1Won: team1Result === undefined ? undefined : team1Result === 'win',
  };
}

export async function fetchGameForBalanceCheck(gameId: number): Promise<CheckedGame> {
  const res = await fetch(`${API_BASE_URL}/v0/games/${gameId}`);
  if (!res.ok) throw new Error(`Game ${gameId} not found`);
  return parseCheckedGame(await res.json());
}

// Latest game of a player; the endpoint includes ongoing (unfinished) games.
export async function fetchLastGameForBalanceCheck(profileId: number): Promise<CheckedGame> {
  const res = await fetch(`${API_BASE_URL}/v0/players/${profileId}/games/last`);
  if (!res.ok) throw new Error(`No last game found for player ${profileId}`);
  return parseCheckedGame(await res.json());
}

export async function searchPlayersForCBT(
  query: string
): Promise<Array<{ profile_id: number; name: string; rating?: number }>> {
  const res = await fetch(
    `${API_BASE_URL}/v0/players/search?query=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.players as Array<{ profile_id: number; name: string; rating?: number }>) || []).map((p) => ({
    profile_id: p.profile_id,
    name: p.name,
    rating: p.rating,
  }));
}
