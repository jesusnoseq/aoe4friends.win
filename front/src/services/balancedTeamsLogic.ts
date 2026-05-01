// ─── Types ───────────────────────────────────────────────────────────────────

export type RatingMode = 'rm_1v1' | 'qm_1v1' | 'rm_2v2' | 'qm_2v2' | 'rm_3v3' | 'qm_3v3' | 'rm_4v4' | 'qm_4v4';

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
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const AI_DIFFICULTIES = [
  { name: 'Easy',        minElo: 500,  maxElo: 700,  repElo: 600  },
  { name: 'Intermediate',minElo: 700,  maxElo: 750,  repElo: 725  },
  { name: 'Hard',        minElo: 750,  maxElo: 850,  repElo: 800  },
  { name: 'Hardest',     minElo: 850,  maxElo: 900,  repElo: 875  },
  { name: 'Ridiculous',  minElo: 900,  maxElo: 1000, repElo: 950  },
  { name: 'Outrageous',  minElo: 1000, maxElo: 1050, repElo: 1025 },
  { name: 'Absurd',      minElo: 1050, maxElo: 1300, repElo: 1175 },
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
  t1Size: number
): { team1: CBTPlayer[]; team2: CBTPlayer[]; diff: number } {
  const combos = combinations(players, t1Size);
  let best = { team1: [] as CBTPlayer[], team2: [] as CBTPlayer[], diff: Infinity };
  for (const combo of combos) {
    const ids = new Set(combo.map(p => p.profile_id));
    const rest = players.filter(p => !ids.has(p.profile_id));
    const diff = Math.abs(teamElo(combo, mode) - teamElo(rest, mode));
    if (diff < best.diff) best = { team1: combo, team2: rest, diff };
  }
  return best;
}

function bestSplitForSize(players: CBTPlayer[], mode: RatingMode): ReturnType<typeof findBestSplit> {
  const N = players.length;
  const half = Math.floor(N / 2);
  let best = findBestSplit(players, mode, half);
  if (N % 2 !== 0) {
    const alt = findBestSplit(players, mode, Math.ceil(N / 2));
    if (alt.diff < best.diff) best = alt;
  }
  return best;
}

export function createTeams(roster: CBTPlayer[], mode: RatingMode): TeamsState {
  // Step 1 – pure player split
  const best = bestSplitForSize(roster, mode);
  if (best.diff <= 50) return { ...best, usedAI: false, balanced: true };

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
      const aiSplit = bestSplitForSize(withAI, mode);
      if (aiSplit.diff <= 50) return { ...aiSplit, usedAI: true, balanced: true };
    }
  }

  // Step 3 – return best we found (imbalanced)
  return { ...best, usedAI: false, balanced: false };
}
