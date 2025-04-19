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
