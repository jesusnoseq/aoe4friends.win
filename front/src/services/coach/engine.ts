import { type GameSummary, type SummaryPlayer } from './types';
import { type CoachTopic, type Finding } from './findings';
import { buildPlayerContext } from './context';
import { COACH_RULES } from './rules';

export interface PlayerReview {
  player: SummaryPlayer;
  findings: Record<CoachTopic, Finding[]>;
}

export interface GameReview {
  gameId: number;
  mapName?: string;
  leaderboard?: string;
  duration: number;
  teams: Array<{ team: number; teamName?: string; players: PlayerReview[] }>;
}

const SEVERITY_ORDER: Record<Finding['severity'], number> = { critical: 0, warning: 1, info: 2 };

export function reviewPlayer(summary: GameSummary, player: SummaryPlayer): PlayerReview {
  const ctx = buildPlayerContext(summary, player);
  const findings: Record<CoachTopic, Finding[]> = {
    economy: [], military: [], technology: [], general: [],
  };
  for (const rule of COACH_RULES) {
    try {
      findings[rule.topic].push(...rule.evaluate(ctx));
    } catch (e) {
      // One misbehaving rule (e.g. on an older summaryVersion) must never
      // take down the whole review.
      console.warn(`Coach rule ${rule.id} failed for ${player.name}:`, e);
    }
  }
  for (const topic of Object.keys(findings) as CoachTopic[]) {
    findings[topic].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }
  return { player, findings };
}

export function reviewGame(summary: GameSummary): GameReview {
  const byTeam = new Map<number, { team: number; teamName?: string; players: PlayerReview[] }>();
  for (const player of summary.players ?? []) {
    const team = player.team ?? 0;
    const group = byTeam.get(team) ?? { team, teamName: player.teamName, players: [] };
    group.players.push(reviewPlayer(summary, player));
    byTeam.set(team, group);
  }
  return {
    gameId: summary.gameId,
    mapName: summary.mapName,
    leaderboard: summary.leaderboard,
    duration: summary.duration,
    teams: [...byTeam.values()].sort((a, b) => a.team - b.team),
  };
}
