import { Game } from "./aoe4worldTypes.request";


// Fetch all games for a profile_id, with paging, and cache in localStorage
export async function fetchGamesWithCache(profileId: number): Promise<Game[]> {
  // ...existing code from fetchGamesWithCache...
  const cacheKey = `aoe4friends_games_${profileId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  let allGames: Game[] = [];
  let page = 1;
  while (true) {
    const url = `https://aoe4world.com/api/v0/players/${profileId}/games?page=${page}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch games');
    const data = await resp.json();
    if (!data.games || data.games.length === 0) break;
    allGames = allGames.concat(data.games);

    if (data.total_count <= (data.page*data.per_page)) break;

    page++;
  }
  localStorage.setItem(cacheKey, JSON.stringify(allGames));
  return allGames;
}
