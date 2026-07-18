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
  profile_id?: number;
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

export interface CivComboStat {
  myCiv: string;    // raw civ key, e.g. "abbasid_dynasty"
  allyCiv: string;
  games: number;
  wins: number;
  losses: number;
}

export interface AllyComboStats {
  profileId: number;
  name: string;
  totalGames: number;  // games together with this ally (in the selected mode)
  wins: number;
  losses: number;
  combos: CivComboStat[];  // sorted by games desc, then win rate desc
}

export interface RatingPoint {
  gameId: number;
  startedAt: string;      // ISO string
  season: number | null;  // game.season
  leaderboard: string;    // normalized display name (see LEADERBOARD_LABELS)
  value: number;          // rating ?? mmr for that game
  diff: number | null;    // rating_diff ?? mmr_diff
  won: boolean;
}

export interface RatingProgression {
  // one series per leaderboard the player has rated games in
  byLeaderboard: { [leaderboard: string]: RatingPoint[] };
}