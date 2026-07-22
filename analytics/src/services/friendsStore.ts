import { hashNick } from './nickHash';

const STORAGE_KEY = 'aoe4friends-analytics-friends';

export function loadFriends(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveFriends(names: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch (err) {
    if (err instanceof Error && err.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded while saving friends list');
    } else {
      throw err;
    }
  }
}

/** Maps nick hash -> nickname for the given friend list. */
export async function buildHashMap(names: string[]): Promise<Map<string, string>> {
  const entries = await Promise.all(
    names.map(async (name) => [await hashNick(name), name] as const)
  );
  return new Map(entries);
}
