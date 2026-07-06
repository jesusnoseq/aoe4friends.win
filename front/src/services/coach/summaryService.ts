import LZString from 'lz-string';
import { API_BASE_URL } from '../apiConfig';
import { type GameSummary } from './types';

// Game summaries are ~1MB of JSON each, so they are LZString-compressed and
// capped to a small LRU set to stay clear of the localStorage quota shared
// with the aoe4friends_games_* cache.
const CACHE_PREFIX = 'aoe4friends_summary_';
const CACHE_INDEX_KEY = 'aoe4friends_summary_index';
const MAX_CACHED_SUMMARIES = 8;

type CacheIndex = Array<{ gameId: number; ts: number }>;

function readIndex(): CacheIndex {
  try {
    return JSON.parse(localStorage.getItem(CACHE_INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeIndex(index: CacheIndex) {
  localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
}

function touchIndex(gameId: number) {
  const index = readIndex().filter(e => e.gameId !== gameId);
  index.push({ gameId, ts: Date.now() });
  while (index.length > MAX_CACHED_SUMMARIES) {
    const oldest = index.reduce((a, b) => (a.ts <= b.ts ? a : b));
    index.splice(index.indexOf(oldest), 1);
    localStorage.removeItem(`${CACHE_PREFIX}${oldest.gameId}`);
  }
  writeIndex(index);
}

function evictOldest(): boolean {
  const index = readIndex();
  if (!index.length) return false;
  const oldest = index.reduce((a, b) => (a.ts <= b.ts ? a : b));
  localStorage.removeItem(`${CACHE_PREFIX}${oldest.gameId}`);
  writeIndex(index.filter(e => e.gameId !== oldest.gameId));
  return true;
}

function readCachedSummary(gameId: number): GameSummary | null {
  const raw = localStorage.getItem(`${CACHE_PREFIX}${gameId}`);
  if (!raw) return null;
  try {
    const json = LZString.decompress(raw);
    if (!json) return null;
    const summary: GameSummary = JSON.parse(json);
    touchIndex(gameId);
    return summary;
  } catch {
    localStorage.removeItem(`${CACHE_PREFIX}${gameId}`);
    return null;
  }
}

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

function cacheSummary(gameId: number, summary: GameSummary) {
  const value = LZString.compress(JSON.stringify(summary));
  const key = `${CACHE_PREFIX}${gameId}`;
  try {
    localStorage.setItem(key, value);
    touchIndex(gameId);
  } catch (e: unknown) {
    if (!isQuotaError(e)) throw e;
    if (evictOldest()) {
      try {
        localStorage.setItem(key, value);
        touchIndex(gameId);
        return;
      } catch (retry: unknown) {
        if (!isQuotaError(retry)) throw retry;
      }
    }
    console.warn('localStorage quota exceeded, not caching game summary.');
  }
}

// Accepts a plain game id, or aoe4world URLs like
// https://aoe4world.com/players/3995534-jesusnoseq/games/241473484?sig=...
// (the ?sig is ignored; the name slug after the profile id is optional).
export function parsePlayerGameUrl(input: string): { profileId?: number; gameId: number } | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return { gameId: Number(trimmed) };
  const full = trimmed.match(/players\/(\d+)(?:-[^/]*)?\/games\/(\d+)/);
  if (full) return { profileId: Number(full[1]), gameId: Number(full[2]) };
  const gameOnly = trimmed.match(/games\/(\d+)/);
  return gameOnly ? { gameId: Number(gameOnly[1]) } : null;
}

export async function fetchGameSummary(profileId: number, gameId: number): Promise<GameSummary> {
  const cached = readCachedSummary(gameId);
  if (cached) return cached;

  const res = await fetch(`${API_BASE_URL}/players/${profileId}/games/${gameId}/summary?camelize=true`);
  if (!res.ok) throw new Error(`No summary available for game ${gameId}`);
  const summary: GameSummary = await res.json();
  if (!summary?.players?.length) throw new Error(`Summary for game ${gameId} has no player data`);
  cacheSummary(gameId, summary);
  return summary;
}

// Latest finished game of the player; if its summary is unavailable, try the
// one before it. No further attempts (by design).
export async function fetchLatestFinishedGameSummary(profileId: number): Promise<GameSummary> {
  const res = await fetch(`${API_BASE_URL}/v0/players/${profileId}/games?page=1`);
  if (!res.ok) throw new Error(`Failed to fetch games of player ${profileId}`);
  const data = await res.json();
  const finished: Array<{ game_id: number }> =
    (data.games as Array<{ game_id: number; ongoing?: boolean }> | undefined)?.filter(g => !g.ongoing) ?? [];
  if (!finished.length) throw new Error('No finished games found');

  try {
    return await fetchGameSummary(profileId, finished[0].game_id);
  } catch {
    if (finished.length < 2) throw new Error('No summary available for the latest game');
    return await fetchGameSummary(profileId, finished[1].game_id);
  }
}
