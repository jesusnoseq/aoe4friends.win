import { type PlayerContext } from './context';

export type CoachTopic = 'economy' | 'military' | 'technology' | 'general';

export type Severity = 'info' | 'warning' | 'critical';

export interface Finding {
  ruleId: string;
  topic: CoachTopic;
  severity: Severity;
  title: string; // short label, e.g. "Idle Town Center time"
  detail: string; // specifics with numbers
  timestamps?: number[]; // game-time seconds, rendered as mm:ss
}

// A coach rule inspects one player's data and returns zero or more findings.
// Add new rules in rules/ and register them in rules/index.ts.
export interface CoachRule {
  id: string;
  topic: CoachTopic;
  evaluate(ctx: PlayerContext): Finding[];
}
