// Team-vs-team aggregates for the game review overview panel.
// Pure data layer: sums per-player summary fields into per-team totals;
// CoachTeamOverview.tsx decides presentation.

import { type GameSummary, type SummaryPlayer, type PlayerScores, type ResourceTotals } from './types';
import { iconBasename, stripTier, classifyUnitBase } from './context';

export interface TeamAward {
  label: string;
  playerName: string;
  detail: string;
}

export interface TeamTotals {
  team: number;
  teamName?: string;
  playerCount: number;
  won?: boolean;
  // Tempo: earliest age-up on the team + how many players got there at all.
  firstFeudal?: number;
  firstCastle?: number;
  firstImperial?: number;
  reachedFeudal: number;
  reachedCastle: number;
  reachedImperial: number;
  // Economy
  resourcesGathered?: ResourceTotals;
  unspentPct?: number; // share of gathered resources never spent
  villagersProduced?: number;
  // Military (summed from _stats)
  unitsProduced?: number;
  unitsKilled?: number;
  unitsLost?: number;
  killsPerUnitProduced?: number;
  buildingsLost?: number;
  // Overall
  scores?: PlayerScores;
  upgrades?: number;
  apmAvg?: number;
  awards: TeamAward[];
}

export interface TeamOverview {
  teams: TeamTotals[];
}

// Sum an optional numeric field: undefined only when no player has it.
function sumOf(players: SummaryPlayer[], get: (p: SummaryPlayer) => number | undefined): number | undefined {
  let sum = 0;
  let any = false;
  for (const p of players) {
    const v = get(p);
    if (v !== undefined) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : undefined;
}

function minOf(players: SummaryPlayer[], get: (p: SummaryPlayer) => number | undefined): number | undefined {
  let min: number | undefined;
  for (const p of players) {
    const v = get(p);
    if (v !== undefined && (min === undefined || v < min)) min = v;
  }
  return min;
}

const RESOURCE_KEYS = ['food', 'gold', 'stone', 'wood', 'oliveoil', 'total'] as const;

function sumResources(players: SummaryPlayer[], get: (p: SummaryPlayer) => ResourceTotals | undefined): ResourceTotals | undefined {
  const out: ResourceTotals = {};
  let any = false;
  for (const key of RESOURCE_KEYS) {
    const v = sumOf(players, p => get(p)?.[key]);
    if (v !== undefined) {
      out[key] = v;
      any = true;
    }
  }
  return any ? out : undefined;
}

const SCORE_KEYS = ['total', 'military', 'economy', 'technology', 'society'] as const;

function sumScores(players: SummaryPlayer[]): PlayerScores | undefined {
  const out: PlayerScores = {};
  let any = false;
  for (const key of SCORE_KEYS) {
    const v = sumOf(players, p => p.scores?.[key]);
    if (v !== undefined) {
      out[key] = v;
      any = true;
    }
  }
  return any ? out : undefined;
}

// Villagers trained during the game (t=0 starting villagers excluded), same
// convention as PlayerContext.villagerFinishedTimes but without building the
// full context.
function villagersProducedBy(player: SummaryPlayer): number | undefined {
  if (!player.buildOrder) return undefined;
  let count = 0;
  for (const e of player.buildOrder) {
    if (e.type !== 'Unit' || (e.constructed?.length ?? 0) > 0) continue;
    const { base } = stripTier(iconBasename(e.icon));
    if (classifyUnitBase(base) !== 'villager') continue;
    count += (e.finished ?? []).filter(t => t > 0).length;
  }
  return count;
}

function ageTime(player: SummaryPlayer, action: string): number | undefined {
  return player.actions?.[action]?.[0];
}

// `blost` is omitted upstream when a player lost 0 buildings; count 0 for any
// player that has a _stats block at all.
function statOf(player: SummaryPlayer, key: string): number | undefined {
  if (!player._stats) return undefined;
  return player._stats[key] ?? (key === 'blost' ? 0 : undefined);
}

function bestPlayer(
  players: SummaryPlayer[],
  metric: (p: SummaryPlayer) => number | undefined,
): { player: SummaryPlayer; value: number } | undefined {
  let best: { player: SummaryPlayer; value: number } | undefined;
  for (const p of players) {
    const v = metric(p);
    if (v !== undefined && (best === undefined || v > best.value)) best = { player: p, value: v };
  }
  return best;
}

function buildAwards(players: SummaryPlayer[]): TeamAward[] {
  if (players.length < 2) return [];
  const awards: TeamAward[] = [];

  const mvp = bestPlayer(players, p => p.scores?.total);
  if (mvp) {
    awards.push({ label: 'MVP', playerName: mvp.player.name, detail: `${mvp.value.toLocaleString()} score` });
  }
  const slayer = bestPlayer(players, p => statOf(p, 'sqkill'));
  if (slayer && slayer.value > 0) {
    awards.push({ label: 'Top slayer', playerName: slayer.player.name, detail: `${slayer.value.toLocaleString()} kills` });
  }
  const hoarder = bestPlayer(players, p => {
    const gathered = p.totalResourcesGathered?.total;
    const spent = p.totalResourcesSpent?.total;
    return gathered !== undefined && spent !== undefined ? gathered - spent : undefined;
  });
  if (hoarder && hoarder.value > 0) {
    awards.push({
      label: 'Biggest hoarder',
      playerName: hoarder.player.name,
      detail: `${hoarder.value.toLocaleString()} resources unspent`,
    });
  }
  return awards;
}

function buildTeamTotals(team: number, teamName: string | undefined, players: SummaryPlayer[]): TeamTotals {
  const gathered = sumResources(players, p => p.totalResourcesGathered);
  const spent = sumResources(players, p => p.totalResourcesSpent);

  let unspentPct: number | undefined;
  if (gathered?.total !== undefined && spent?.total !== undefined && gathered.total > 0) {
    unspentPct = ((gathered.total - spent.total) / gathered.total) * 100;
  }

  const unitsProduced = sumOf(players, p => statOf(p, 'sqprod'));
  const unitsKilled = sumOf(players, p => statOf(p, 'sqkill'));

  const apms = players.map(p => p.apm).filter((v): v is number => v !== undefined);
  const results = players.map(p => p.result).filter((v): v is string => v !== undefined);

  return {
    team,
    teamName,
    playerCount: players.length,
    won: results.length > 0 ? results.includes('win') : undefined,
    firstFeudal: minOf(players, p => ageTime(p, 'feudalAge')),
    firstCastle: minOf(players, p => ageTime(p, 'castleAge')),
    firstImperial: minOf(players, p => ageTime(p, 'imperialAge')),
    reachedFeudal: players.filter(p => ageTime(p, 'feudalAge') !== undefined).length,
    reachedCastle: players.filter(p => ageTime(p, 'castleAge') !== undefined).length,
    reachedImperial: players.filter(p => ageTime(p, 'imperialAge') !== undefined).length,
    resourcesGathered: gathered,
    unspentPct,
    villagersProduced: sumOf(players, villagersProducedBy),
    unitsProduced,
    unitsKilled,
    unitsLost: sumOf(players, p => statOf(p, 'sqlost')),
    killsPerUnitProduced:
      unitsProduced !== undefined && unitsProduced > 0 && unitsKilled !== undefined
        ? unitsKilled / unitsProduced
        : undefined,
    buildingsLost: sumOf(players, p => statOf(p, 'blost')),
    scores: sumScores(players),
    upgrades: sumOf(players, p => statOf(p, 'upg')),
    apmAvg: apms.length > 0 ? Math.round(apms.reduce((a, b) => a + b, 0) / apms.length) : undefined,
    awards: buildAwards(players),
  };
}

export function buildTeamOverview(summary: GameSummary): TeamOverview {
  const byTeam = new Map<number, { teamName?: string; players: SummaryPlayer[] }>();
  for (const player of summary.players ?? []) {
    const team = player.team ?? 0;
    const group = byTeam.get(team) ?? { teamName: player.teamName, players: [] };
    group.players.push(player);
    byTeam.set(team, group);
  }
  return {
    teams: [...byTeam.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([team, { teamName, players }]) => buildTeamTotals(team, teamName, players)),
  };
}
