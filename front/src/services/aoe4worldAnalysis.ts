import {  AnalyzeGamesResult, CivStat, AllyOpponentStat, NameStatPair } from './aoe4worldTypes.analysis';
import { Game, Player } from './aoe4worldTypes.request';

export function analyzeGames(games: Game[], profileId: number): AnalyzeGamesResult {
  // ...existing code from analyzeGames...
  const opponents: { [name: string]: AllyOpponentStat } = {};
  const allies: { [name: string]: AllyOpponentStat } = {};
  const civStats: { [civ: string]: CivStat } = {};
  let wins = 0, losses = 0, totalGames = 0;

  // collect per‐game outcomes for streaks & recent rates
  const gameResults: { started_at: string; won: boolean }[] = [];

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
        if (tIdx === playerTeamIndex) {
          if (!allies[name]) allies[name] = { games: 0, wins: 0, losses: 0 };
          allies[name].games++;
          if (playerWon) allies[name].wins++; else allies[name].losses++;
        } else {
          if (!opponents[name]) opponents[name] = { games: 0, wins: 0, losses: 0 };
          opponents[name].games++;
          if (playerWon) opponents[name].losses++; else opponents[name].wins++;
        }
      }
    }

    gameResults.push({ started_at: game.started_at, won: playerWon });
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
  for (const g of sortedByDate) {
    if (g.won) {
      tempWin++;
      longestWinStreak = Math.max(longestWinStreak, tempWin);
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

  // Sort civStats by total desc
  const sortedCivStats: { [civ: string]: CivStat } = {};
  Object.entries(civStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([k, v]) => { sortedCivStats[k] = v; });

  // Sort allies/opponents by games desc
  const sortedAllies = Object.entries(allies)
    .map(([Name, Stat]) => ({ Name, Stat }))
    .sort((a, b) => b.Stat.games - a.Stat.games);
  const sortedOpponents = Object.entries(opponents)
    .map(([Name, Stat]) => ({ Name, Stat }))
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
  };
}
