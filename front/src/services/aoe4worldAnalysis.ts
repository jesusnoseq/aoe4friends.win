import {  AnalyzeGamesResult, CivStat, AllyOpponentStat, DurationDistribution, RatingProgression, RatingPoint } from './aoe4worldTypes.analysis';
import { Game, Player } from './aoe4worldTypes.request';

export function analyzeGames(games: Game[], profileId: number): AnalyzeGamesResult {
  const opponents: { [profile_id: number]: AllyOpponentStat & { profile_id: number; name: string } } = {};
  const allies: { [profile_id: number]: AllyOpponentStat & { profile_id: number; name: string } } = {};
  const civStats: { [civ: string]: CivStat } = {};
  let wins = 0, losses = 0, totalGames = 0;

  // For new stats
  let totalDuration = 0;
  let durationCount = 0;
  // Changed: five buckets instead of three
  const durationBuckets: DurationDistribution = { veryShort: 0, short: 0, medium: 0, long: 0, veryLong: 0 };
  const mapStats: { [map: string]: { games: number; wins: number; losses: number } } = {};
  // Track the longest game duration (in seconds)
  let longestGame = 0;

  // collect per‐game outcomes for streaks & recent rates
  const gameResults: { started_at: Date; won: boolean; duration: number; map: string }[] = [];

  for (const game of games) {
    let playerInfo: Player | null = null;
    let playerTeamIndex = -1;
    for (let tIdx = 0; tIdx < game.teams.length; tIdx++) {
      for (const member of game.teams[tIdx]) {
        if (member.player.profile_id === profileId) {
          playerInfo = member.player;
          playerTeamIndex = tIdx;
          break;
        }
      }
      if (playerInfo) break;
    }
    if (!playerInfo) continue;

    totalGames++;
    const playerWon = playerInfo.result === 'win';
    if (playerWon) wins++; else losses++;

    // Civ stats
    const pciv = playerInfo.civilization;
    if (!civStats[pciv]) civStats[pciv] = { total: 0, wins: 0, losses: 0 };
    civStats[pciv].total++;
    if (playerWon) civStats[pciv].wins++; else civStats[pciv].losses++;

    // Allies/opponents
    for (let tIdx = 0; tIdx < game.teams.length; tIdx++) {
      for (const member of game.teams[tIdx]) {
        const other = member.player;
        if (other.profile_id === profileId) continue;
        const name = other.name;
        const pid = other.profile_id;
        if (tIdx === playerTeamIndex) {
          if (!allies[pid]) allies[pid] = { games: 0, wins: 0, losses: 0, profile_id: pid, name };
          allies[pid].games++;
          if (playerWon) allies[pid].wins++; else allies[pid].losses++;
        } else {
          if (!opponents[pid]) opponents[pid] = { games: 0, wins: 0, losses: 0, profile_id: pid, name };
          opponents[pid].games++;
          if (playerWon) opponents[pid].losses++; else opponents[pid].wins++;
        }
      }
    }

    // Duration stats
    if (typeof game.duration === 'number' && !isNaN(game.duration)) {
      totalDuration += game.duration;
      durationCount++;
      // Buckets in seconds (example intervals)
      if (game.duration < 10 * 60) durationBuckets.veryShort++;
      else if (game.duration < 20 * 60) durationBuckets.short++;
      else if (game.duration < 30 * 60) durationBuckets.medium++;
      else if (game.duration < 40 * 60) durationBuckets.long++;
      else durationBuckets.veryLong++;
      // Track longest game
      if (game.duration > longestGame) longestGame = game.duration;
    }

    // Map stats
    const map = game.map || 'Unknown';
    if (!mapStats[map]) mapStats[map] = { games: 0, wins: 0, losses: 0 };
    mapStats[map].games++;
    if (playerWon) mapStats[map].wins++; else mapStats[map].losses++;

    gameResults.push({ started_at: game.started_at, won: playerWon, duration: game.duration, map });
  }

  // after all games processed, compute streaks & recent rates
  const sortedByDate = gameResults
    .slice()
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  // current win‐streak (from latest backwards)
  let currentStreak = 0;
  for (let i = sortedByDate.length - 1; i >= 0; i--) {
    if (sortedByDate[i].won) currentStreak++;
    else break;
  }

  // longest win & loss streaks
  let longestWinStreak = 0, longestLossStreak = 0;
  let tempWin = 0, tempLoss = 0;
  // Track max win streak (could be same as longestWinStreak, but explicit for clarity)
  let maxWinStreak = 0;
  for (const g of sortedByDate) {
    if (g.won) {
      tempWin++;
      longestWinStreak = Math.max(longestWinStreak, tempWin);
      maxWinStreak = Math.max(maxWinStreak, tempWin);
      tempLoss = 0;
    } else {
      tempLoss++;
      longestLossStreak = Math.max(longestLossStreak, tempLoss);
      tempWin = 0;
    }
  }

  // helper for last‑N win‐rate
  const calcRecent = (n: number) => {
    const slice = sortedByDate.slice(-n);
    const w = slice.filter((g) => g.won).length;
    return slice.length > 0 ? Math.round((w / slice.length) * 100) : 0;
  };

  const winRateLast10 = calcRecent(10);
  const winRateLast50 = calcRecent(50);

  // Average game length (in mm:ss)
  let averageGameLength = '-';
  if (durationCount > 0) {
    const avgSec = Math.round(totalDuration / durationCount);
    const min = Math.floor(avgSec / 60);
    const sec = avgSec % 60;
    averageGameLength = `${min}:${sec.toString().padStart(2, '0')}`;
  }

  // Sort civStats by total desc
  const sortedCivStats: { [civ: string]: CivStat } = {};
  Object.entries(civStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([k, v]) => { sortedCivStats[k] = v; });

  // Sort allies/opponents by games desc
  const sortedAllies = Object.values(allies)
    .map(stat => ({ Name: stat.name, profile_id: stat.profile_id, Stat: { games: stat.games, wins: stat.wins, losses: stat.losses } }))
    .sort((a, b) => b.Stat.games - a.Stat.games);
  const sortedOpponents = Object.values(opponents)
    .map(stat => ({ Name: stat.name, profile_id: stat.profile_id, Stat: { games: stat.games, wins: stat.wins, losses: stat.losses } }))
    .sort((a, b) => b.Stat.games - a.Stat.games);

  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return {
    wins,
    losses,
    totalGames,
    winRate,
    civStats: sortedCivStats,
    allies: sortedAllies,
    opponents: sortedOpponents,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    winRateLast10,
    winRateLast50,
    averageGameLength,
    durationDistribution: { ...durationBuckets },
    mapStats,
    maxWinStreak,
    longestGame,
  };
}

// Normalized display names for the leaderboards tracked by the rating chart.
// Only these ladders are charted (anything else is ignored), and aliases that
// mean the same ladder collapse to one name — rm_solo and rm_1v1 both map to
// "Ranked 1v1", merging their points into a single series.
// rm = Ranked, qm = Quick Match, qm_*_ew = Empire Wars, qm_ffa = FFA.
export const LEADERBOARD_LABELS: { [rawKey: string]: string } = {
  rm_solo: 'Ranked 1v1',
  rm_1v1: 'Ranked 1v1',
  rm_2v2: 'Ranked 2v2',
  rm_3v3: 'Ranked 3v3',
  rm_4v4: 'Ranked 4v4',
  rm_team: 'Ranked Team',
  qm_solo: 'Quick Match 1v1',
  qm_2v2: 'Quick Match 2v2',
  qm_3v3: 'Quick Match 3v3',
  qm_4v4: 'Quick Match 4v4',
  qm_2v2_ew: 'Empire Wars 2v2',
  qm_3v3_ew: 'Empire Wars 3v3',
  qm_4v4_ew: 'Empire Wars 4v4',
  qm_ffa: 'FFA',
};

// Human-readable label for a raw leaderboard/kind string (e.g. "qm_4v4" ->
// "Quick Match 4v4"). Falls back to a generic prettifier for ladders not in
// LEADERBOARD_LABELS so unknown modes still render sensibly.
export function formatLeaderboard(raw: string | null | undefined): string {
  if (!raw) return 'Unknown';
  const known = LEADERBOARD_LABELS[raw];
  if (known) return known;
  return raw
    .replace(/^rm_/, 'Ranked ')
    .replace(/^qm_/, 'Quick Match ')
    .replace(/_ew\b/, ' EW')
    .replace(/_/g, ' ')
    .trim();
}

// Row grouping + display order for the rating-chart filter pills: one row per
// entry. Ranked on the first row, Quick Match on the second, Empire Wars & FFA
// on the third. Rows/labels with no data for a player are hidden by the chart.
export const LEADERBOARD_GROUPS: { group: 'rm' | 'qm' | 'ew'; labels: string[] }[] = [
  { group: 'rm', labels: ['Ranked 1v1', 'Ranked 2v2', 'Ranked 3v3', 'Ranked 4v4', 'Ranked Team'] },
  { group: 'qm', labels: ['Quick Match 1v1', 'Quick Match 2v2', 'Quick Match 3v3', 'Quick Match 4v4'] },
  { group: 'ew', labels: ['Empire Wars 2v2', 'Empire Wars 3v3', 'Empire Wars 4v4', 'FFA'] },
];

/**
 * Builds a per-leaderboard rating/MMR time series for a player from raw games.
 * Rating is per-ladder, so points are grouped by normalized leaderboard name
 * (see LEADERBOARD_LABELS) and each group is sorted chronologically. Only the
 * ladders in LEADERBOARD_LABELS are tracked; games on other ladders and games
 * without a rating and mmr are skipped, so the series reflects rated games only.
 * Pure function — no side effects.
 */
export function buildRatingProgression(games: Game[], profileId: number): RatingProgression {
  const byLeaderboard: { [leaderboard: string]: RatingPoint[] } = {};

  for (const game of games) {
    let playerInfo: Player | null = null;
    for (const team of game.teams) {
      for (const member of team) {
        if (member.player.profile_id === profileId) {
          playerInfo = member.player;
          break;
        }
      }
      if (playerInfo) break;
    }
    if (!playerInfo) continue;

    const value = playerInfo.rating ?? playerInfo.mmr;
    if (value === null || value === undefined) continue;

    const rawLeaderboard = String(game.leaderboard ?? game.kind);
    const label = LEADERBOARD_LABELS[rawLeaderboard];
    if (!label) continue; // only track known ladders

    const point: RatingPoint = {
      gameId: game.game_id,
      startedAt: new Date(game.started_at).toISOString(),
      season: game.season ?? null,
      leaderboard: label,
      value,
      diff: playerInfo.rating_diff ?? playerInfo.mmr_diff ?? null,
      won: playerInfo.result === 'win',
    };

    if (!byLeaderboard[label]) byLeaderboard[label] = [];
    byLeaderboard[label].push(point);
  }

  for (const leaderboard of Object.keys(byLeaderboard)) {
    byLeaderboard[leaderboard].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );
  }

  return { byLeaderboard };
}
