export interface CivStat {
  total: number;
  wins: number;
  losses: number;
}

export interface AllyOpponentStat {
  games: number;
  wins: number;
  losses: number;
}

export interface NameStatPair {
  Name: string;
  Stat: AllyOpponentStat;
}

export interface AnalyzeGamesResult {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  civStats: { [civ: string]: CivStat };
  allies: NameStatPair[];
  opponents: NameStatPair[];
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  winRateLast10: number;
  winRateLast50: number;
  averageGameLength?: string;
  durationDistribution?: DurationDistribution;
  mapStats?: {
    [map: string]: {
      games: number;
      wins: number;
      losses: number;
    };
  };
  maxWinStreak?: number;
  longestGame?: number;
}

export type DurationDistribution = {
  veryShort: number;
  short: number;
  medium: number;
  long: number;
  veryLong: number;
};