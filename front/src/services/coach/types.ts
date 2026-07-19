// Minimal, tolerant types for the aoe4world game summary endpoint
// (/players/{profileId}/games/{gameId}/summary?camelize=true).
// Only the fields the coach rules use are declared; everything that may be
// missing in older summaryVersions is optional and guarded at use sites.

export interface GameSummary {
  gameId: number;
  mapName?: string;
  leaderboard?: string;
  duration: number;
  winReason?: string;
  players: SummaryPlayer[];
}

export interface SummaryPlayer {
  profileId: number;
  name: string;
  civilization: string;
  team?: number;
  teamName?: string;
  apm?: number;
  result?: string;
  scores?: PlayerScores;
  totalResourcesGathered?: ResourceTotals;
  totalResourcesSpent?: ResourceTotals;
  // Action name (camelCase, often with civ suffixes like ...Jpn) -> game-time seconds.
  actions?: Record<string, number[]>;
  buildOrder?: BuildOrderEntry[];
  resources?: ResourceSeries;
  _stats?: Record<string, number>;
}

export interface PlayerScores {
  total?: number;
  military?: number;
  economy?: number;
  technology?: number;
  society?: number;
}

export interface ResourceTotals {
  food?: number;
  gold?: number;
  stone?: number;
  wood?: number;
  oliveoil?: number; // Byzantine olive oil / Macedonian silver slot
  total?: number;
}

export interface BuildOrderEntry {
  icon: string; // e.g. "icons/races/common/units/archer_2"
  type: string; // "Unit" | "Building" | "Upgrade" | "Age" | "Animal" | "Unknown"
  finished?: number[]; // per-instance completion times (units, upgrades); t=0 = starting units
  constructed?: number[]; // buildings
  destroyed?: number[]; // deaths / razes
}

export interface ResourceSeries {
  timestamps?: number[]; // sampled every ~20s
  food?: number[];
  gold?: number[];
  stone?: number[];
  wood?: number[];
  // Fifth resource, stored in the API's "oliveoil" slot for both Byzantines
  // (olive oil) and their Macedonian variant (silver). Only present for civs
  // that use it, and even then the time series may be missing while totals are
  // reported (e.g. Macedonians expose oliveoilGathered but no oliveoil series).
  oliveoil?: number[];
}
