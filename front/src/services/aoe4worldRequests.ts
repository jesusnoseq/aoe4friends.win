import { Game } from "./aoe4worldTypes.request";
import LZString from "lz-string";

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
      const url = `https://aoe4world.com/api/v0/players/${profileId}/games?page=${page}`;
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
    const url = `https://aoe4world.com/api/v0/players/${profileId}/games?page=${page}`;
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
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
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

function parseCBTProfile(data: any): CBTPlayerProfile {
  const getRating = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      if (data[key]?.rating !== undefined) return data[key].rating;
      if (data.leaderboards?.[key]?.rating !== undefined) return data.leaderboards[key].rating;
      if (data.modes?.[key]?.rating !== undefined) return data.modes[key].rating;
    }
    return undefined;
  };
  return {
    profile_id: data.profile_id,
    name: data.name,
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
  const res = await fetch(`https://aoe4world.com/api/v0/players/${profileId}`);
  if (!res.ok) throw new Error(`Failed to fetch player ${profileId}`);
  return parseCBTProfile(await res.json());
}

export async function searchPlayersForCBT(
  query: string
): Promise<Array<{ profile_id: number; name: string; rating?: number }>> {
  const res = await fetch(
    `https://aoe4world.com/api/v0/players/search?query=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.players || []).map((p: any) => ({
    profile_id: p.profile_id,
    name: p.name,
    rating: p.rating,
  }));
}
