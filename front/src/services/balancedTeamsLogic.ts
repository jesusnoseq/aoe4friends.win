// ─── Types ───────────────────────────────────────────────────────────────────

export type RatingMode = 'rm_1v1' | 'qm_1v1' | 'rm_2v2' | 'qm_2v2' | 'rm_3v3' | 'qm_3v3' | 'rm_4v4' | 'qm_4v4';

export type BalanceAlgorithm = 'raw-elo' | 'strength-sum' | 'strength-std-max';

export interface AlgorithmMeta {
  key: BalanceAlgorithm;
  label: string;
  description: string;
}

export interface CBTPlayer {
  profile_id: number;
  name: string;
  ratings: { rm_1v1?: number; qm_1v1?: number; rm_2v2?: number; qm_2v2?: number; rm_3v3?: number; qm_3v3?: number; rm_4v4?: number; qm_4v4?: number };
  isAI?: boolean;
  aiDifficulty?: string;
}

export interface TeamsState {
  team1: CBTPlayer[];
  team2: CBTPlayer[];
  diff: number;
  balanced: boolean;
  usedAI: boolean;
  algorithm: BalanceAlgorithm;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const STRENGTH_COEFFICIENT = 1000;  // For strength = 10^(elo / 400)
export const STRENGTH_MAX_WEIGHT = 0.15;  // Weight of max strength in strength-std-max
export const STRENGTH_STD_WEIGHT = 0.15;   // Weight of standard deviation in strength-std-max

export const AI_DIFFICULTIES = [
  { name: 'Easy',        minElo: 600,  maxElo: 800,  repElo: 700  },
  { name: 'Intermediate',minElo: 800,  maxElo: 850,  repElo: 825  },
  { name: 'Hard',        minElo: 850,  maxElo: 950,  repElo: 900  },
  { name: 'Hardest',     minElo: 950,  maxElo: 1000, repElo: 975  },
  { name: 'Ridiculous',  minElo: 1000, maxElo: 1100, repElo: 1050 },
  { name: 'Outrageous',  minElo: 1100, maxElo: 1150, repElo: 1125 },
  { name: 'Absurd',      minElo: 1150, maxElo: 1400, repElo: 1275 },
];

export const BALANCE_ALGORITHMS: AlgorithmMeta[] = [
  {
    key: 'raw-elo',
    label: 'Raw ELO Sum',
    description: 'Minimizes the absolute difference in total ELO. Simple and predictable.',
  },
  {
    key: 'strength-sum',
    label: 'Strength Sum',
    description: 'Uses strength = 10^(ELO/600). Higher-rated players carry more weight, reflecting real skill scaling.',
  },
  {
    key: 'strength-std-max',
    label: 'Strength + Std/Max',
    description: 'Score = Σstrength + 0.15×max − 0.20×σ. Rewards team depth while penalizing lopsided compositions.',
  },
];

// ─── Algorithm ───────────────────────────────────────────────────────────────

export function getBalanceElo(player: CBTPlayer, mode: RatingMode): number {
  const order: RatingMode[] = [mode, 'rm_1v1', 'qm_1v1', 'rm_2v2', 'qm_2v2', 'rm_3v3', 'qm_3v3', 'rm_4v4', 'qm_4v4'];
  for (const m of order) {
    if (player.ratings[m] !== undefined) return player.ratings[m]!;
  }
  return 0;
}

export function teamElo(team: CBTPlayer[], mode: RatingMode): number {
  return team.reduce((s, p) => s + getBalanceElo(p, mode), 0);
}

export function computeTeamScore(team: CBTPlayer[], mode: RatingMode, algorithm: BalanceAlgorithm): number {
  if (algorithm === 'raw-elo') return teamElo(team, mode);
  const strengths = team.map(p => Math.pow(10, getBalanceElo(p, mode) / STRENGTH_COEFFICIENT));
  const sum = strengths.reduce((s, v) => s + v, 0);
  if (algorithm === 'strength-sum') return sum;
  // strength-std-max
  if (strengths.length === 0) return 0;
  const max = Math.max(...strengths);
  const mean = sum / strengths.length;
  const stdDev = Math.sqrt(strengths.reduce((s, v) => s + (v - mean) ** 2, 0) / strengths.length);
  return sum + STRENGTH_MAX_WEIGHT * max - STRENGTH_STD_WEIGHT * stdDev;
}

export function isTeamBalanced(
  team1: CBTPlayer[],
  team2: CBTPlayer[],
  mode: RatingMode,
  algorithm: BalanceAlgorithm,
): boolean {
  if (algorithm === 'raw-elo') {
    return Math.abs(teamElo(team1, mode) - teamElo(team2, mode)) <= 50;
  }
  const s1 = computeTeamScore(team1, mode, algorithm);
  const s2 = computeTeamScore(team2, mode, algorithm);
  const avg = (s1 + s2) / 2;
  return avg > 0 && Math.abs(s1 - s2) / avg <= 0.03;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  if (k === arr.length) return [[...arr]];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ];
}

function findBestSplit(
  players: CBTPlayer[],
  mode: RatingMode,
  t1Size: number,
  algorithm: BalanceAlgorithm,
): { team1: CBTPlayer[]; team2: CBTPlayer[]; diff: number } {
  const combos = combinations(players, t1Size);
  let best = { team1: [] as CBTPlayer[], team2: [] as CBTPlayer[], diff: Infinity };
  for (const combo of combos) {
    const ids = new Set(combo.map(p => p.profile_id));
    const rest = players.filter(p => !ids.has(p.profile_id));
    const diff = Math.abs(computeTeamScore(combo, mode, algorithm) - computeTeamScore(rest, mode, algorithm));
    if (diff < best.diff) best = { team1: combo, team2: rest, diff };
  }
  return best;
}

function bestSplitForSize(
  players: CBTPlayer[],
  mode: RatingMode,
  algorithm: BalanceAlgorithm,
): ReturnType<typeof findBestSplit> {
  const N = players.length;
  const half = Math.floor(N / 2);
  let best = findBestSplit(players, mode, half, algorithm);
  if (N % 2 !== 0) {
    const alt = findBestSplit(players, mode, Math.ceil(N / 2), algorithm);
    if (alt.diff < best.diff) best = alt;
  }
  return best;
}

export function createTeams(
  roster: CBTPlayer[],
  mode: RatingMode,
  algorithm: BalanceAlgorithm = 'raw-elo',
): TeamsState {
  // Step 1 – pure player split
  const best = bestSplitForSize(roster, mode, algorithm);
  const eloDiff = Math.abs(teamElo(best.team1, mode) - teamElo(best.team2, mode));
  if (isTeamBalanced(best.team1, best.team2, mode, algorithm)) {
    return { team1: best.team1, team2: best.team2, diff: eloDiff, usedAI: false, balanced: true, algorithm };
  }

  // Step 2 – try adding an AI (only when roster is odd; even counts split evenly without AI)
  if (roster.length < 8 && roster.length % 2 !== 0) {
    const maxElo = Math.max(...roster.map(p => getBalanceElo(p, mode)));
    const minAiIdx = maxElo >= 800
      ? AI_DIFFICULTIES.findIndex(d => d.name === 'Hard')
      : 0;

    for (let i = minAiIdx; i < AI_DIFFICULTIES.length; i++) {
      const d = AI_DIFFICULTIES[i];
      const ai: CBTPlayer = {
        profile_id: -(i + 1),
        name: `AI (${d.name})`,
        ratings: { rm_1v1: d.repElo, qm_1v1: d.repElo, rm_2v2: d.repElo, qm_2v2: d.repElo, rm_3v3: d.repElo, qm_3v3: d.repElo, rm_4v4: d.repElo, qm_4v4: d.repElo },
        isAI: true,
        aiDifficulty: d.name,
      };
      const withAI = [...roster, ai];
      const aiSplit = bestSplitForSize(withAI, mode, algorithm);
      if (isTeamBalanced(aiSplit.team1, aiSplit.team2, mode, algorithm)) {
        const aiEloDiff = Math.abs(teamElo(aiSplit.team1, mode) - teamElo(aiSplit.team2, mode));
        return { team1: aiSplit.team1, team2: aiSplit.team2, diff: aiEloDiff, usedAI: true, balanced: true, algorithm };
      }
    }
  }

  // Step 3 – return best we found (imbalanced)
  return { team1: best.team1, team2: best.team2, diff: eloDiff, usedAI: false, balanced: false, algorithm };
}
