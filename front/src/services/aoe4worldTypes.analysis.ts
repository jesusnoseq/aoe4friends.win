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
}